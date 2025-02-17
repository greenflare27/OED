/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const { chai, mocha, expect, app, testDB, testUser } = require('../../../common');
const Meter = require('../../../../models/Meter');
const Reading = require('../../../../models/Reading');
const Point = require('../../../../models/Point');
const fs = require('fs');
const csv = require('csv');
const promisify = require('es6-promisify');
const moment = require('moment');

const parseCsv = promisify(csv.parse);

const UPLOAD_METERS_ROUTE = '/api/csv/meters';
const UPLOAD_READINGS_ROUTE = '/api/csv/readings';

const CHAI_READINGS_REQUEST = `chai.request(app).post('${UPLOAD_READINGS_ROUTE}').field('email', '${testUser.email}').field('password', '${testUser.password}')`;
const CHAI_METERS_REQUEST = `chai.request(app).post('${UPLOAD_METERS_ROUTE}').field('email', '${testUser.email}').field('password', '${testUser.password}')`;

// Note there is only one description for all uploads in a test (not an array)
// but all other keys are arrays of length number of uploads in test.
// Note the use of double quotes for strings because some have single quotes within.
const testCases = {
	// pipe1: {
	// 	description: "Ascending time readings",
	// 	chaiRequest: [CHAI_READINGS_REQUEST + ".field('createMeter', 'true').field('meterName', 'pipe1').field('gzip', 'false')"],
	// 	fileName: ['pipe1Input.csv'],
	// 	responseCode: [200],
	// 	responseString: ["<h1>SUCCESS</h1><h2>It looks like the insert of the readings was a success.</h2>"]
	// },
	// pipe2: {
	//     description: "Descending time readings",
	//     chaiRequest: [CHAI_READINGS_REQUEST + ".field('createMeter', 'true').field('meterName', 'pipe2').field('gzip', 'false').field('timeSort', 'decreasing')"],
	//     fileName: ['pipe2Input.csv'],
	//     responseCode: [200],
	//     responseString: ["<h1>SUCCESS</h1><h2>It looks like the insert of the readings was a success.</h2>"]
	// },
	// pipe3: {
	//     description: "Cumulative time readings",
	//     chaiRequest: [CHAI_READINGS_REQUEST + ".field('createMeter', 'true').field('meterName', 'pipe3').field('gzip', 'false').field('cumulative', 'true')"],
	//     fileName: ['pipe3Input.csv'],
	//     responseCode: [400],
	//     // TODO for Will: I had to change the times from +00:00 to Z in the messages. I'm not sure why they are wrong
	//     // and this could change again with daylight savings PR?
	//     responseString: ["<h1>FAILURE</h1><h2>It looks like the insert of the readings had issues with some or all of the readings where the processing of the readings returned these warning(s)/error(s):</h2><br>For meter pipe3: Error parsing Reading #1. Reading value gives 24 with error message:<br>The first ever reading must be dropped when dealing with cumulative data.<br>For reading #1 on meter pipe3 in pipeline: previous reading has value 0 start time 1970-01-01T00:00:00Z end time 1970-01-01T00:00:00Z and current reading has value 24 start time 2021-06-01T00:00:00Z end time 2021-06-02T00:00:00Z with timeSort increasing; duplications 1; cumulative true; cumulativeReset false; cumulativeResetStart 00:00:00; cumulativeResetEnd 23:59:59.999999; lengthGap 0; lengthVariation 0; onlyEndTime false<br><h2>Readings Dropped and should have previous messages</h2><ol><li>Dropped Reading #1 for meter pipe3</li></ol>"]
	// },
	// TODO not updated yet
	// pipe4: {
	//     chaiRequest: [CHAI_READINGS_REQUEST + ".field('createMeter', 'true').field('meterName', 'pipe4').field('gzip', 'false').field('cumulative', 'true').field('cumulativeReset','true')"],
	//     fileName: ['pipe4Input.csv'],
	//     responseCode: [400]
	// },
	// pipe5: {
	//     chaiRequest: [CHAI_READINGS_REQUEST + ".field('createMeter', 'true').field('meterName', 'pipe5').field('gzip', 'false').field('cumulative', 'true').field('cumulativeReset','true').field('cumulativeResetStart','23:45').field('cumulativeResetEnd','00:15')"],
	//     fileName: ['pipe5Input.csv'],
	//     responseCode: [400]
	// },
	// pipe6: {
	//     chaiRequest: [CHAI_READINGS_REQUEST + ".field('createMeter', 'true').field('meterName', 'pipe6').field('gzip', 'false').field('cumulative', 'true').field('cumulativeReset','true').field('cumulativeResetStart','11:45').field('cumulativeResetEnd','12:15')"],
	//     fileName: ['pipe6Input.csv'],
	//     responseCode: [400]
	// },
	// pipe7: {
	//     chaiRequest: [CHAI_READINGS_REQUEST + ".field('createMeter', 'true').field('meterName', 'pipe7').field('gzip', 'false').field('cumulative', 'true').field('cumulativeReset','true').field('cumulativeResetStart','00:00').field('cumulativeResetEnd','00:00.001')"],
	//     fileName: ['pipe7Input.csv'],
	//     responseCode: [400]
	// },
	// pipe8: {
	//     chaiRequest: [CHAI_READINGS_REQUEST + ".field('createMeter', 'true').field('meterName', 'pipe8').field('gzip', 'false').field('cumulative', 'true')"],
	//     fileName: ['pipe8Input.csv'],
	//     responseCode: [400]
	// },
	// pipe9: {
	//     chaiRequest: [CHAI_READINGS_REQUEST + ".field('createMeter', 'true').field('meterName', 'pipe9').field('gzip', 'false').field('cumulative', 'true').field('cumulativeReset','true')"],
	//     fileName: ['pipe9Input.csv'],
	//     responseCode: [400]
	// },
	// pipe10: {
	//     chaiRequest: [CHAI_READINGS_REQUEST + ".field('createMeter', 'true').field('meterName', 'pipe10').field('gzip', 'false').field('cumulative', 'true').field('cumulativeReset','true')"],
	//     fileName: ['pipe10Input.csv'],
	//     responseCode: [400]
	// },
	// pipe11: {
	//     chaiRequest: [CHAI_READINGS_REQUEST + ".field('cumulative','true').field('cumulativeReset','true').field('cumulativeResetStart','11:45').field('cumulativeResetEnd','12:15').field('meterName','pipe11').field('createMeter','true').field('gzip', 'false')"],
	//     fileName: ['pipe11Input.csv'],
	//     responseCode: [400]
	// },
	// pipe12: {
	//     chaiRequest: [CHAI_READINGS_REQUEST + ".field('cumulative','true').field('cumulativeReset','true').field('cumulativeResetStart','23:45').field('cumulativeResetEnd','00:15').field('createMeter','true').field('gzip', 'false')"],
	//     fileName: ['pipe12Input.csv'],
	//     responseCode: [400]
	// },
	// pipe13: {
	//     chaiRequest: [CHAI_READINGS_REQUEST + ".field('meterName','pipe13').field('createMeter','true').field('gzip', 'false')"],
	//     fileName: ['pipe13Input.csv'],
	//     responseCode: [200]
	// },
	// pipe14: {
	//     chaiRequest: [CHAI_READINGS_REQUEST + ".field('meterName','pipe14').field('lengthVariation','60').field('createMeter','true').field('gzip', 'false')"],
	//     fileName: ['pipe14Input.csv'],
	//     responseCode: [200]
	// },
	// pipe15: {
	//     chaiRequest: [CHAI_READINGS_REQUEST + ".field('meterName','pipe15').field('lengthVariation','120').field('createMeter','true').field('gzip', 'false')"],
	//     fileName: ['pipe15Input.csv'],
	//     responseCode: [200]
	// },
	// pipe16: {
	//     chaiRequest: [CHAI_READINGS_REQUEST + ".field('meterName','pipe16').field('lengthVariation','121').field('createMeter','true').field('gzip', 'false')"],
	//     fileName: ['pipe16Input.csv'],
	//     responseCode: [200]
	// },
	// pipe17: {
	//     chaiRequest: [CHAI_READINGS_REQUEST + ".field('meterName','pipe17').field('lengthGap','60').field('lengthVariation','121').field('createMeter','true').field('gzip', 'false')"],
	//     fileName: ['pipe17Input.csv'],
	//     responseCode: [200]
	// },
	// pipe18: {
	//     chaiRequest: [CHAI_READINGS_REQUEST + ".field('meterName','pipe18').field('lengthGap','120').field('lengthVariation','121').field('createMeter','true').field('gzip', 'false')"],
	//     fileName: ['pipe18Input.csv'],
	//     responseCode: [200]
	// },
	// pipe19: {
	//     chaiRequest: [CHAI_READINGS_REQUEST + ".field('headerRow','true').field('cumulative','true').field('meterName','pipe19').field('createMeter','true').field('gzip', 'false')"],
	//     fileName: ['pipe19Input.csv'],
	//     responseCode: [400]
	// },
	// pipe20: {
	//     chaiRequest: [CHAI_READINGS_REQUEST + ".field('headerRow','true').field('cumulative','true').field('meterName','pipe20').field('createMeter','true')"],
	//     fileName: ['pipe20Input.csv'],
	//     responseCode: [400]
	// },
	// pipe21: {
	//     chaiRequest: CHAI_READINGS_REQUEST + ".field('duplications','3').field('cumulative')"
	// },
	// pipe22: {
	// },
	// pipe23: {
	// },
	// pipe24: {
	// },
	// pipe25: {
	// },

	// updated past here.
	// pipe40: {
	//     description: "Cumulative time zipped readings with header",
	//     chaiRequest: [CHAI_READINGS_REQUEST + ".field('headerRow','true').field('cumulative','true').field('createMeter','true').field('meterName', 'pipe40')"],
	//     fileName: ['pipe40Input.csv.gz'],
	//     responseCode: [400],
	// 	// TODO for Will: I had to change the sample output from pipe20 to pipe40 to use the new number.
	//     responseString: ["<h1>FAILURE</h1><h2>It looks like the insert of the readings had issues with some or all of the readings where the processing of the readings returned these warning(s)/error(s):</h2><br>For meter pipe40: Error parsing Reading #1. Reading value gives 24 with error message:<br>The first ever reading must be dropped when dealing with cumulative data.<br>For reading #1 on meter pipe40 in pipeline: previous reading has value 0 start time 1970-01-01T00:00:00Z end time 1970-01-01T00:00:00Z and current reading has value 24 start time 2021-06-01T00:00:00Z end time 2021-06-02T00:00:00Z with timeSort increasing; duplications 1; cumulative true; cumulativeReset false; cumulativeResetStart 00:00:00; cumulativeResetEnd 23:59:59.999999; lengthGap 0; lengthVariation 0; onlyEndTime false<br><h2>Readings Dropped and should have previous messages</h2><ol><li>Dropped Reading #1 for meter pipe40</li></ol>"]
	// },
	// pipe50: {
	//     description: "Two readings uploads where update readings",
	//     chaiRequest: [CHAI_READINGS_REQUEST + ".field('gzip', 'false').field('createMeter','true').field('meterName', 'pipe50')", CHAI_READINGS_REQUEST + ".field('gzip', 'false').field('update','true').field('meterName', 'pipe50')"],
	//     fileName: ['pipe50AInput.csv', 'pipe50BInput.csv'],
	//     responseCode: [200, 200],
	//     responseString: ["<h1>SUCCESS</h1><h2>It looks like the insert of the readings was a success.</h2>", "<h1>SUCCESS</h1><h2>It looks like the insert of the readings was a success.</h2><h3>However, note that the processing of the readings returned these warning(s):</h3><br>For meter pipe50: Warning parsing Reading #1. Reading value gives 0 with warning message:<br>The current reading startTime is not after the previous reading's end time. Note this is treated only as a warning since readings may be sent out of order.<br>There is a gap in time between this reading and the previous reading that exceeds the allowed amount of 0 seconds.<br>For reading #1 on meter pipe50 in pipeline: previous reading has value 120 start time 2021-06-05T00:00:00Z end time 2021-06-06T00:00:00Z and current reading has value 0 start time 2021-05-31T00:00:00Z end time 2021-06-01T00:00:00Z with timeSort increasing; duplications 1; cumulative false; cumulativeReset false; cumulativeResetStart 00:00:00; cumulativeResetEnd 23:59:59.999999; lengthGap 0; lengthVariation 0; onlyEndTime false<br>"]
	// },
	// pipe60: {
	// 	description: "Three readings uploads with cumulative data",
	// 	chaiRequest: [CHAI_READINGS_REQUEST + ".field('gzip', 'false').field('createMeter','true').field('meterName', 'pipe60').field('cumulative', 'true')", CHAI_READINGS_REQUEST + ".field('gzip', 'false').field('meterName', 'pipe60').field('cumulative', 'true')", CHAI_READINGS_REQUEST + ".field('gzip', 'false').field('meterName', 'pipe60').field('cumulative', 'true')"],
	// 	fileName: ['pipe60AInput.csv', 'pipe60BInput.csv', 'pipe60CInput.csv'],
	// 	responseCode: [400, 200, 200],
	// 	responseString: ["<h1>FAILURE</h1><h2>It looks like the insert of the readings had issues with some or all of the readings where the processing of the readings returned these warning(s)/error(s):</h2><br>For meter pipe60: Error parsing Reading #1. Reading value gives 24 with error message:<br>The first ever reading must be dropped when dealing with cumulative data.<br>For reading #1 on meter pipe60 in pipeline: previous reading has value 0 start time 1970-01-01T00:00:00Z end time 1970-01-01T00:00:00Z and current reading has value 24 start time 2021-06-01T00:00:00Z end time 2021-06-02T00:00:00Z with timeSort increasing; duplications 1; cumulative true; cumulativeReset false; cumulativeResetStart 00:00:00; cumulativeResetEnd 23:59:59.999999; lengthGap 0; lengthVariation 0; onlyEndTime false<br><h2>Readings Dropped and should have previous messages</h2><ol><li>Dropped Reading #1 for meter pipe60</li></ol>", "<h1>SUCCESS</h1><h2>It looks like the insert of the readings was a success.</h2>", "<h1>SUCCESS</h1><h2>It looks like the insert of the readings was a success.</h2>"]
	// },
	// TODO for WIll: I had to edit the input meter file because it expects the meter name to match the key here so not 32 but 75.
	// pipe75: {
	// 	description: "Set to decreasing for meter then without timeSort parameter for readings",
	// 	chaiRequest: [CHAI_METERS_REQUEST + ".field('headerRow','true').field('gzip', 'false')", CHAI_READINGS_REQUEST + ".field('meterName','pipe75').field('gzip', 'false')"],
	// 	fileName: ['pipe75AInputMeter.csv', 'pipe75BInput.csv'],
	// 	responseCode: [200, 200],
	// 	responseString: ["<h1>SUCCESS</h1>Successfully inserted the meters.', '<h1>SUCCESS</h1><h2>It looks like the insert of the readings was a success.</h2>"]
	// },
	// pipe80: {
	// 	description: "Two meter uploads then reading upload with cumulative",
	// 	chaiRequest: [CHAI_METERS_REQUEST + ".field('gzip', 'false')", CHAI_METERS_REQUEST + ".field('gzip', 'false').field('update','true').field('meterName', 'pipe80')", CHAI_READINGS_REQUEST + ".field('gzip', 'false').field('meterName', 'pipe80')"],
	// 	fileName: ['pipe80AInputMeter.csv', 'pipe80BInputMeter.csv', 'pipe80CInput.csv'],
	// 	responseCode: [200, 200, 400],
	// 	responseString: ["<h1>SUCCESS</h1>Successfully inserted the meters.", "<h1>SUCCESS</h1>Successfully inserted the meters.", "<h1>FAILURE</h1><h2>It looks like the insert of the readings had issues with some or all of the readings where the processing of the readings returned these warning(s)/error(s):</h2><br>For meter pipe80: Error parsing Reading #1. Reading value gives 24 with error message:<br>The first ever reading must be dropped when dealing with cumulative data.<br>For reading #1 on meter pipe80 in pipeline: previous reading has value 0 start time 1970-01-01T00:00:00Z end time 1970-01-01T00:00:00Z and current reading has value 24 start time 2021-06-01T00:00:00Z end time 2021-06-02T00:00:00Z with timeSort increasing; duplications 1; cumulative true; cumulativeReset false; cumulativeResetStart 00:00:00; cumulativeResetEnd 23:59:59.999999; lengthGap 0; lengthVariation 0; onlyEndTime false<br><h2>Readings Dropped and should have previous messages</h2><ol><li>Dropped Reading #1 for meter pipe80</li></ol>"]
	// },
	// pipe90: {
	// 	description: "Two meter uploads with header and zipped where second sets cumulative & reset, renames meter then reading upload without cumulative or reset",
	// 	chaiRequest: [CHAI_METERS_REQUEST + ".field('headerRow','true')", CHAI_METERS_REQUEST + ".field('headerRow','true').field('update','true').field('meterName', 'pipe90x')", CHAI_READINGS_REQUEST + ".field('gzip', 'false').field('meterName', 'pipe90')"],
	// 	fileName: ['pipe90AInputMeter.csv.gz', 'pipe90BInputMeter.csv.gz', 'pipe90CInput.csv'],
	// 	responseCode: [200, 200, 400],
	// 	responseString: ["<h1>SUCCESS</h1>Successfully inserted the meters.", "<h1>SUCCESS</h1>Successfully inserted the meters.", "<h1>FAILURE</h1><h2>It looks like the insert of the readings had issues with some or all of the readings where the processing of the readings returned these warning(s)/error(s):</h2><br>For meter pipe90: Error parsing Reading #1. Reading value gives 24 with error message:<br>The first ever reading must be dropped when dealing with cumulative data.<br>For reading #1 on meter pipe90 in pipeline: previous reading has value 0 start time 1970-01-01T00:00:00Z end time 1970-01-01T00:00:00Z and current reading has value 24 start time 2021-06-01T00:00:00Z end time 2021-06-02T00:00:00Z with timeSort increasing; duplications 1; cumulative true; cumulativeReset true; cumulativeResetStart 00:00:00; cumulativeResetEnd 23:59:59.999999; lengthGap 0; lengthVariation 0; onlyEndTime false<br><h2>Readings Dropped and should have previous messages</h2><ol><li>Dropped Reading #1 for meter pipe90</li></ol>"]
	// }
}

for (let fileKey in testCases) {
	const numUploads = testCases[fileKey].chaiRequest.length;
	mocha.it(`Testing files starting '${fileKey}' doing '${testCases[fileKey]["description"]}' with ${numUploads} requests`, async () => {
		for (let index = 0; index < numUploads; index++) {
			// It would be nice to put a mocha.describe inside the loop to tell the upload starting
			// but that breaks the tests.
			// Each set of uploads must be in one mocha because the DB is reset with each test.
			let inputFile = testCases[fileKey]['fileName'][index];
			let expectedFile = `${fileKey}Expected.csv`;
			let inputPath = `${__dirname}/${inputFile}`;
			let expectedPath = `${__dirname}/${expectedFile}`;
			let inputBuffer = fs.readFileSync(inputPath);
			let expectedBuffer = fs.readFileSync(expectedPath);
			let evalString = `${testCases[fileKey]["chaiRequest"][index]}.attach('csvfile', inputBuffer, '${inputPath}')`;
			// TODO It would be nice if this was not an eval. Tried a function with closure but could not get it to work as did not find chai.
			const res = await eval(evalString);
			expect(res).to.have.status(testCases[fileKey]['responseCode'][index]);
			expect(res).to.be.html;
			// OED returns a string with messages that we check it is what was expected.
			expect(res.text).to.equal(testCases[fileKey]['responseString'][index]);
		}
		// You do not want to check the database until all the uploads are done.
		const conn = testDB.getConnection();
		// Get every meter to be sure only one with correct name.
		const meters = await Meter.getAll(conn);
		expect(meters.length).to.equal(1);
		expect(meters[0].name).to.equal(fileKey);
		const readings = await Reading.getAllByMeterID(meters[0].id, conn);
		const extractedReadings = readings.map(reading => {
			return [`${reading.reading}`, reading.startTimestamp.format('YYYY-MM-DD HH:mm:ss'), reading.endTimestamp.format('YYYY-MM-DD HH:mm:ss')];
		});
		const fileReadings = await parseCsv(expectedBuffer);
		expect(extractedReadings).to.deep.equals(fileReadings);
	});
}

// Begin testing of meters.

// The GPS value used when want one.
// TODO check out why needs to be backward
// const gps = new Point(25, 50);
const gps = new Point(50, 25);

const testMeters = {
	pipe100: {
		description: "Second meter upload where incorrectly provides meter name so fails",
		chaiRequest: [CHAI_METERS_REQUEST + ".field('gzip', 'false').field('headerRow','true')", CHAI_METERS_REQUEST + ".field('gzip', 'false').field('update','true').field('meterName', 'pipe100').field('headerRow','true')"],
		fileName: ['pipe100InputMeter.csv', 'pipe100InputMeter.csv'],
		responseCode: [200, 400],
		responseString: ["<h1>SUCCESS</h1>Successfully inserted the meters.", "<h1>FAILURE</h1>CSVPipelineError: Failed to upload meters due to internal OED Error: Meter name provided (pipe100) in request with update for meters but more than one meter in CSV so not processing"],
		metersUploaded: [
			new Meter(
				undefined, // id
				'pipe100', // name
				null, // URL
				false, // enabled
				false, //displayable
				'other', //type
				null, // timezone
				undefined, // gps
				undefined, // identifier
				null, // note
				null, //area
				undefined, // cumulative
				undefined, //cumulativeReset
				undefined, // cumulativeResetStart
				undefined, // cumulativeResetEnd
				undefined, // readingGap
				undefined, // readingVariation
				undefined, //readingDuplication
				undefined, // timeSort
				undefined, //endOnlyTime
				undefined, // reading
				undefined, // startTimestamp
				undefined // endTimestamp
			),
			new Meter(
				undefined, // id
				'pipe100b', // name
				'123.45.6.0', // URL
				true, // enabled
				true, //displayable
				'obvius', //type
				'US/Central', // timezone
				// null, // timezone
				gps, // gps
				'pipe100b id', // identifier
				'my Note', // note
				33, //area
				true, // cumulative
				true, //cumulativeReset
				'14:44:00', // cumulativeResetStart
				'15:55:00', // cumulativeResetEnd
				12.34, // readingGap
				56.78, // readingVariation
				7, //readingDuplication
				'decreasing', // timeSort
				true, //endOnlyTime
				89.90, // reading
				moment('1666-07-08 17:13:19'), // startTimestamp
				moment('1777-08-09 05:07:11') // endTimestamp
			)
		]
	},
	pipe101: {
		description: "Second meter with same name so fails but first meter exists",
		chaiRequest: [CHAI_METERS_REQUEST + ".field('gzip', 'false').field('headerRow','true')"],
		fileName: ['pipe101InputMeter.csv'],
		responseCode: [400],
		responseString: ['<h1>FAILURE</h1>CSVPipelineError: Failed to upload meters due to internal OED Error: Meter name of pipe101 seems to exist when inserting new meters and got DB error of: duplicate key value violates unique constraint "meters_name_key"'],
		metersUploaded: [
			new Meter(
				undefined, // id
				'pipe101', // name
				null, // URL
				false, // enabled
				false, //displayable
				'other', //type
				null, // timezone
				undefined, // gps
				undefined, // identifier
				null, // note
				null, //area
				undefined, // cumulative
				undefined, //cumulativeReset
				undefined, // cumulativeResetStart
				undefined, // cumulativeResetEnd
				undefined, // readingGap
				undefined, // readingVariation
				undefined, //readingDuplication
				undefined, // timeSort
				undefined, //endOnlyTime
				undefined, // reading
				undefined, // startTimestamp
				undefined // endTimestamp
			)
		]
	},
	pipe102: {
		description: "Update meter where name does not exist so fails",
		chaiRequest: [CHAI_METERS_REQUEST + ".field('gzip', 'false').field('headerRow','true').field('update','true')"],
		fileName: ['pipe102InputMeter.csv'],
		responseCode: [400],
		responseString: ['<h1>FAILURE</h1>CSVPipelineError: Failed to upload meters due to internal OED Error: Meter name of pipe102 does not seem to exist with update for meters and got DB error of: No data returned from the query.'],
		metersUploaded: []
	}
}

for (let fileKey in testMeters) {
	const numUploads = testMeters[fileKey].chaiRequest.length;
	mocha.it(`Meter testing files starting '${fileKey}' doing '${testMeters[fileKey]["description"]}' with ${numUploads} requests`, async () => {
		const conn = testDB.getConnection();
		for (let index = 0; index < numUploads; index++) {
			// It would be nice to put a mocha.describe inside the loop to tell the upload starting
			// but that breaks the tests.
			// Each set of uploads must be in one mocha because the DB is reset with each test.
			let inputFile = testMeters[fileKey]['fileName'][index];
			let inputPath = `${__dirname}/${inputFile}`;
			let inputBuffer = fs.readFileSync(inputPath);
			let evalString = `${testMeters[fileKey]["chaiRequest"][index]}.attach('csvfile', inputBuffer, '${inputPath}')`;
			// TODO It would be nice if this was not an eval. Tried a function with closure but could not get it to work as did not find chai.
			const res = await eval(evalString);
			expect(res).to.have.status(testMeters[fileKey]['responseCode'][index]);
			expect(res).to.be.html;
			// OED returns a string with messages that we check it is what was expected.
			expect(res.text).to.equal(testMeters[fileKey]['responseString'][index]);
		}
		// You do not want to check the database until all the uploads are done.
		// Get every meter to be sure only one with correct name.
		const meters = await Meter.getAll(conn);
		let numExpected = testMeters[fileKey]['metersUploaded'].length;
		expect(meters.length).to.equal(numExpected);
		// Loop over meters to see if correct values.
		for (let index = 0; index < numExpected; index++) {
			let meterUse = testMeters[fileKey]['metersUploaded'][index];
			let meter = await Meter.getByName(meterUse.name, conn);
			compareMeters(meterUse, meter);
		}
	});
}

function compareMeters(expectMeter, receivedMeter) {
	expect(receivedMeter).to.have.property('name', expectMeter.name);
	expect(receivedMeter).to.have.property('ipAddress', expectMeter.ipAddress);
	expect(receivedMeter).to.have.property('enabled', expectMeter.enabled);
	expect(receivedMeter).to.have.property('displayable', expectMeter.displayable);
	expect(receivedMeter).to.have.property('type', expectMeter.type);
	expect(receivedMeter).to.have.property('meterTimezone', expectMeter.meterTimezone);
	expect(receivedMeter).to.have.property('gps');
	// Only check GPS value if it exists.
	if (receivedMeter.gps !== null) {
		expect(receivedMeter.gps).to.have.property('latitude', expectMeter.gps.latitude);
		expect(receivedMeter.gps).to.have.property('longitude', expectMeter.gps.longitude);
	}
	expect(receivedMeter).to.have.property('identifier', expectMeter.identifier);
	expect(receivedMeter).to.have.property('note', expectMeter.note);
	expect(receivedMeter).to.have.property('area', expectMeter.area);
	expect(receivedMeter).to.have.property('cumulative', expectMeter.cumulative);
	expect(receivedMeter).to.have.property('cumulativeReset', expectMeter.cumulativeReset);
	expect(receivedMeter).to.have.property('cumulativeResetStart', expectMeter.cumulativeResetStart);
	expect(receivedMeter).to.have.property('cumulativeResetEnd', expectMeter.cumulativeResetEnd);
	expect(receivedMeter).to.have.property('readingGap', expectMeter.readingGap);
	expect(receivedMeter).to.have.property('readingVariation', expectMeter.readingVariation);
	expect(receivedMeter).to.have.property('readingDuplication', expectMeter.readingDuplication);
	expect(receivedMeter).to.have.property('timeSort', expectMeter.timeSort);
	expect(receivedMeter).to.have.property('endOnlyTime', expectMeter.endOnlyTime);
	expect(receivedMeter).to.have.property('reading', expectMeter.reading);
	expect(receivedMeter).to.have.property('startTimestamp');
	expect(receivedMeter.startTimestamp.format('YYYY-MM-DD HH:mm:ss')).to.equal(expectMeter.startTimestamp.format('YYYY-MM-DD HH:mm:ss'));
	expect(receivedMeter).to.have.property('endTimestamp');
	expect(receivedMeter.endTimestamp.format('YYYY-MM-DD HH:mm:ss')).to.equal(expectMeter.endTimestamp.format('YYYY-MM-DD HH:mm:ss'));
}
