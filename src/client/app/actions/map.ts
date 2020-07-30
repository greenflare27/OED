/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import {ActionType, Dispatch, GetState, Thunk} from '../types/redux/actions';
import * as t from '../types/redux/map';
import {CalibrationModeTypes, MapData, MapMetadata} from '../types/redux/map';
import {
	calibrate,
	CalibratedPoint,
	CalibrationResult,
	CartesianPoint,
	Dimensions,
	GPSPoint
} from "../utils/calibration";
import {State} from "../types/redux/state";
import {mapsApi} from "../utils/api";
import {showErrorNotification, showSuccessNotification} from "../utils/notifications";
import translate from "../utils/translate";
import * as moment from 'moment';
import { browserHistory } from '../utils/history';
import {logToServer} from "./logs";

function requestMapsDetails(): t.RequestMapsDetailsAction {
	return { type: ActionType.RequestMapsDetails };
}

function receiveMapsDetails(data: MapData[]): t.ReceiveMapsDetailsAction {
	return { type: ActionType.ReceiveMapsDetails, data };
}

function submitMapEdits(mapID: number): t.SubmitEditedMapAction {
	return { type: ActionType.SubmitEditedMap, mapID };
}

function confirmMapEdits(mapID: number): t.ConfirmEditedMapAction {
	return { type: ActionType.ConfirmEditedMap, mapID};
}

function requestSelectedMap() {
	return { type: ActionType.RequestSelectedMap };
}

function receiveSelectedMap(map: MapData) {
	return { type: ActionType.ReceiveSelectedMap, map};
}

export function fetchMapsDetails(): Thunk {
	return async (dispatch: Dispatch) => {
		dispatch(requestMapsDetails());
		const mapsDetails = await mapsApi.details();
		dispatch(receiveMapsDetails(mapsDetails));
	};
}

export function editMapDetails(map: MapMetadata): t.EditMapDetailsAction {
	return {type: ActionType.EditMapDetails, map: map};
}

function incrementCounter(): t.IncrementCounterAction {
	return { type: ActionType.IncrementCounter};
}

export function setNewMap(): Thunk {
	return async (dispatch: Dispatch) => {
		dispatch(incrementCounter());
		dispatch((dispatch2, getState2) => {
			const temporaryID = getState2().maps.newMapCounter * -1;
			dispatch2(logToServer('info', `Set up new map, id = ${temporaryID}`));
			dispatch2(setCalibration(CalibrationModeTypes.initiate, temporaryID));
		});
	}
}

export function setCalibration(mode: CalibrationModeTypes, mapID: number): Thunk {
	return async (dispatch: Dispatch) => {
		dispatch(prepareCalibration(mode, mapID));
		dispatch((dispatch2) => {
			dispatch2(logToServer('info', `Start Calibration for map, id=${mapID}, mode:${mode}`));
		});
	}
}

function prepareCalibration(mode: CalibrationModeTypes, mapID: number): t.SetCalibrationAction {
	return { type: ActionType.SetCalibration, mode, mapID };
}

export function dropCalibration(): Thunk {
	return async (dispatch: Dispatch, getState: GetState) => {
		const mapToReset = getState().maps.calibratingMap;
		dispatch(resetCalibration());
		dispatch((dispatch2) => {
			dispatch2(logToServer('info', `reset calibration for map, id: ${mapToReset}.`));
		});
	}
}

function resetCalibration(): t.ResetCalibrationAction {
	return { type: ActionType.ResetCalibration};
}

export function updateMapSource(data: MapMetadata): t.UpdateMapSourceAction {
	return { type: ActionType.UpdateMapSource, data };
}

export function updateMapMode(nextMode: CalibrationModeTypes): t.ChangeMapModeAction {
	return { type: ActionType.UpdateCalibrationMode, nextMode };
}

export function changeSelectedMap(newSelectedMapID: number): t.UpdateSelectedMapAction {
	return { type: ActionType.UpdateSelectedMap, mapID: newSelectedMapID };
}

export function updateCurrentCartesian(currentCartesian: CartesianPoint): t.UpdateCurrentCartesianAction {
	return { type: ActionType.UpdateCurrentCartesian, currentCartesian };
}

function hasCartesian(point: CalibratedPoint) {
	return point.cartesian.x != -1 && point.cartesian.y != -1;
}

export function offerCurrentGPS(currentGPS: GPSPoint): Thunk {
	return (dispatch, getState) => {
		const mapID = getState().maps.calibratingMap;
		const point = getState().maps.editedMaps[mapID].currentPoint;
		if (point && hasCartesian(point)) {
			point.gps = currentGPS;
			dispatch(updateCalibrationSet(point));
			dispatch(resetCurrentPoint());
			// Nesting dispatches to preserve that updateCalibrationSet() is called before calibration
			dispatch((dispatch2, getState2) => {
				dispatch2(logToServer('info', `accepted gps input: latitude:${currentGPS.latitude},longitude:${currentGPS.longitude}
				and added to data point`));
				if (isReadyForCalibration(getState2())) {
					const result = prepareDataToCalibration(getState());
					dispatch2(updateResult(result));
					dispatch2(logToServer('info', `calculation complete, maxError: x:${result.maxError.x},y:${result.maxError.y},
					origin:${result.origin.latitude},${result.origin.longitude}, opposite:${result.opposite.latitude},${result.opposite.longitude}`));
				} else {
					dispatch2(logToServer('info', 'threshold not met, didn\'t trigger calibration'));
				}
			});
		}
		return Promise.resolve();
	}
}

function updateCalibrationSet(calibratedPoint: CalibratedPoint): t.AppendCalibrationSetAction {
	return { type: ActionType.AppendCalibrationSet, calibratedPoint};
}

/**
 * use a default number as the threshold in determining if it's safe to call the calibration function
 * @param state
 */
function isReadyForCalibration(state: State): boolean {
	const calibrationThreshold = 3;
	// @ts-ignore
	return state.maps.editedMaps[state.maps.calibratingMap].calibrationSet.length >= calibrationThreshold;
}

function updateCurrentGPS(currentGPS: GPSPoint): t.UpdateCurrentGPSAction {
	return { type: ActionType.UpdateCurrentGPS, currentGPS};
}

/**
 *  prepare data to required formats to pass it to function calculating mapScales
 */
function prepareDataToCalibration(state: State): CalibrationResult {
	const mapID = state.maps.calibratingMap;
	let image = new Image();
	image.src = state.maps.editedMaps[mapID].mapSource;
	const imageDimensions: Dimensions = {
		width: image.width,
		height: image.height
	};
	// @ts-ignore
	const result = calibrate(state.maps.editedMaps[mapID].calibrationSet, imageDimensions);
	return result;
}

function updateResult(result: CalibrationResult): t.UpdateCalibrationResultAction {
	return { type: ActionType.UpdateCalibrationResults, result}
}

export function resetCurrentPoint(): t.ResetCurrentPointAction {
	return { type: ActionType.ResetCurrentPoint } ;
}

export function submitEditedMaps(): Thunk {
	return async (dispatch: Dispatch, getState: GetState) => {
		Object.keys(getState().maps.editedMaps).forEach(mapID2Submit => {
			const mapID = parseInt(mapID2Submit);
			if (getState().maps.submitting.indexOf(mapID) === -1) {
				dispatch(submitEditedMap(mapID));
			}
		});
	};
}

export function submitCalibratingMap(): Thunk {
	return async (dispatch: Dispatch, getState: GetState) => {
		const mapID = getState().maps.calibratingMap;
		if (mapID < 0) {
			dispatch(submitNewMap());
		} else {
			dispatch(submitEditedMap(mapID));
		}
	}
}

export function submitNewMap(): Thunk {
	return async (dispatch: Dispatch, getState: GetState) => {
		const mapID = getState().maps.calibratingMap;
		const map = getState().maps.editedMaps[mapID];
		try {
			const acceptableMap: MapData = {
				...map,
				modifiedDate: moment().toISOString(),
				origin: (map.calibrationResult)? map.calibrationResult.origin : undefined,
				opposite: (map.calibrationResult)? map.calibrationResult.opposite : undefined
			};
			await mapsApi.create(acceptableMap);
			if (map.calibrationResult) {
				dispatch(logToServer('info', 'New calibrated map uploaded to database'));
				showSuccessNotification(translate('upload.new.map.with.calibration'));
			} else {
				dispatch(logToServer('info', 'New map uploaded to database(without calibration)'));
				showSuccessNotification(translate('upload.new.map.without.calibration'));
			}
			dispatch(confirmMapEdits(mapID));
			browserHistory.push('/maps');
		} catch (e) {
			showErrorNotification(translate('failed.to.create.map'));
			dispatch(logToServer('error', `failed to create map, ${e}`));
		}
	}
}

export function submitEditedMap(mapID: number): Thunk {
	return async (dispatch: Dispatch, getState: GetState) => {
		const map = getState().maps.editedMaps[mapID];
		dispatch(submitMapEdits(mapID));
		try {
			const acceptableMap: MapData = {
				...map,
				modifiedDate: moment().toISOString(),
				origin: (map.calibrationResult)? map.calibrationResult.origin : map.origin,
				opposite: (map.calibrationResult)? map.calibrationResult.opposite : map.opposite,
			}
			await mapsApi.edit(acceptableMap);
			if (map.calibrationResult) {
				dispatch(logToServer('info', 'Edited map uploaded to database(calibrated)'));
				showSuccessNotification(translate("updated.map.with.calibration"));
			} else {
				dispatch(logToServer('info', 'New map uploaded to database(without calibration)'));
				showSuccessNotification(translate("updated.map.without.calibration"));
			}
			dispatch(confirmMapEdits(mapID));
			browserHistory.push('/maps');
		} catch (err) {
			showErrorNotification(translate('failed.to.edit.map'));
			dispatch(logToServer('error', `failed to edit map, ${err}`));
		}
	};
}
