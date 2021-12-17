/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { connect } from 'react-redux';
import PreferencesComponent from '../../components/admin/PreferencesComponent';
import {
	updateDisplayTitle,
	updateDefaultChartToRender,
	toggleDefaultBarStacking,
	updateTimeZone,
	updateDefaultLanguage,
	submitPreferencesIfNeeded,
	updateDefaultWarningFileSize,
	updateDefaultFileSizeLimit
} from '../../actions/admin';
import { removeUnsavedChanges, updateUnsavedChanges } from '../../actions/unsavedWarning';
import { State } from '../../types/redux/state';
import { Dispatch } from '../../types/redux/actions';
import { ChartTypes } from '../../types/redux/graph';
import { LanguageTypes } from '../../types/redux/i18n';

function mapStateToProps(state: State) {
	return {
		displayTitle: state.admin.displayTitle,
		defaultChartToRender: state.admin.defaultChartToRender,
		defaultTimeZone: state.admin.defaultTimeZone,
		defaultBarStacking: state.admin.defaultBarStacking,
		defaultLanguage: state.admin.defaultLanguage,
		disableSubmitPreferences: state.admin.submitted,
		defaultWarningFileSize: state.admin.defaultWarningFileSize,
		defaultFileSizeLimit: state.admin.defaultFileSizeLimit
	};
}

function mapDispatchToProps(dispatch: Dispatch) {
	return {
		updateDisplayTitle: (displayTitle: string) => dispatch(updateDisplayTitle(displayTitle)),
		updateDefaultChartType: (defaultChartToRender: ChartTypes) => dispatch(updateDefaultChartToRender(defaultChartToRender)),
		updateDefaultTimeZone: (timeZone: string) => dispatch(updateTimeZone(timeZone)),
		toggleDefaultBarStacking: () => dispatch(toggleDefaultBarStacking()),
		updateDefaultLanguage: (defaultLanguage: LanguageTypes) => dispatch(updateDefaultLanguage(defaultLanguage)),
		submitPreferences: () => dispatch(submitPreferencesIfNeeded()),
		updateDefaultWarningFileSize: (defaultWarningFileSize: number) => dispatch(updateDefaultWarningFileSize(defaultWarningFileSize)),
		updateDefaultFileSizeLimit: (defaultFileSizeLimit: number) => dispatch(updateDefaultFileSizeLimit(defaultFileSizeLimit)),
		updateUnsavedChanges: (submitFunction: () => any) => dispatch(updateUnsavedChanges(submitFunction)),
		removeUnsavedChanges: () => dispatch(removeUnsavedChanges())
	};
}

export default connect(mapStateToProps, mapDispatchToProps)(PreferencesComponent);
