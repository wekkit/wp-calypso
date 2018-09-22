/** @format */
/**
 * External dependencies
 */
import Dispatcher from 'dispatcher';
import { castArray, flowRight, includes } from 'lodash';

/**
 * Internal dependencies
 */
import wpLib from 'lib/wp';
import {
	IMPORTS_AUTHORS_SET_MAPPING,
	IMPORTS_AUTHORS_START_MAPPING,
	IMPORTS_FETCH,
	IMPORTS_FETCH_FAILED,
	IMPORTS_FETCH_COMPLETED,
	IMPORTS_IMPORT_CANCEL,
	IMPORTS_IMPORT_LOCK,
	IMPORTS_IMPORT_RECEIVE,
	IMPORTS_IMPORT_RESET,
	IMPORTS_IMPORT_START,
	IMPORTS_IMPORT_UNLOCK,
	IMPORTS_START_IMPORTING,
	IMPORTS_UPLOAD_FAILED,
	IMPORTS_UPLOAD_COMPLETED,
	IMPORTS_UPLOAD_SET_PROGRESS,
	IMPORTS_UPLOAD_START,
} from 'state/action-types';
import { appStates } from 'state/imports/constants';
import { fromApi, toApi } from 'lib/importer/common';

const wpcom = wpLib.undocumented();

const ID_GENERATOR_PREFIX = 'local-generated-id-';

/*
 * The following `order` functions prepare objects that can be
 * sent to the API to accomplish a specific purpose. Instead of
 * actually calling the API, however, they return the _order_,
 * or request object, so that the calling function can send it
 * to the API.
 */

// Creates a request object to cancel an importer
const createCancelOrder = ( siteId, importerId ) =>
	toApi( { importerId, importerState: appStates.CANCEL_PENDING, site: { ID: siteId } } );

// Creates a request to expire an importer session
const createExpiryOrder = ( siteId, importerId ) =>
	toApi( { importerId, importerState: appStates.EXPIRE_PENDING, site: { ID: siteId } } );

// Creates a request object to start performing the actual import
const createImportOrder = importerStatus =>
	toApi( {
		...importerStatus,
		importerState: appStates.IMPORTING,
	} );

const apiStart = () => {
	const action = { type: IMPORTS_FETCH };
	Dispatcher.handleViewAction( action );
};

const apiSuccess = data => {
	const action = { type: IMPORTS_FETCH_COMPLETED };
	Dispatcher.handleViewAction( action );

	return data;
};
const apiFailure = data => {
	const action = { type: IMPORTS_FETCH_FAILED };
	Dispatcher.handleViewAction( action );

	return data;
};

function receiveImporterStatus( importerStatus ) {
	const action = {
		type: IMPORTS_IMPORT_RECEIVE,
		importerStatus,
	};
	Dispatcher.handleViewAction( action );
}

export function cancelImport( siteId, importerId ) {
	const lockImportAction = {
		type: IMPORTS_IMPORT_LOCK,
		importerId,
	};
	Dispatcher.handleViewAction( lockImportAction );

	const cancelImportAction = {
		type: IMPORTS_IMPORT_CANCEL,
		importerId,
		siteId,
	};
	Dispatcher.handleViewAction( cancelImportAction );

	// Bail if this is merely a local importer object because
	// there is nothing on the server-side to cancel
	if ( includes( importerId, ID_GENERATOR_PREFIX ) ) {
		return;
	}

	apiStart();
	wpcom
		.updateImporter( siteId, createCancelOrder( siteId, importerId ) )
		.then( apiSuccess )
		.then( fromApi )
		.then( receiveImporterStatus )
		.catch( apiFailure );
}
// createFailUploadAction
export const failUpload = importerId => ( { message: error } ) => ( {
	type: IMPORTS_UPLOAD_FAILED,
	importerId,
	error,
} );

export function fetchState( siteId ) {
	apiStart();

	return wpcom
		.fetchImporterState( siteId )
		.then( apiSuccess )
		.then( castArray )
		.then( importers => importers.map( fromApi ) )
		.then( importers => importers.map( receiveImporterStatus ) )
		.catch( apiFailure );
}

// createmapAuthorAction
export const mapAuthor = ( importerId, sourceAuthor, targetAuthor ) => ( {
	type: IMPORTS_AUTHORS_SET_MAPPING,
	importerId,
	sourceAuthor,
	targetAuthor,
} );

export function resetImport( siteId, importerId ) {
	// We are done with this import session, so lock it away
	const lockImportAction = {
		type: IMPORTS_IMPORT_LOCK,
		importerId,
	};
	Dispatcher.handleViewAction( lockImportAction );

	const resetImportAction = {
		type: IMPORTS_IMPORT_RESET,
		importerId,
		siteId,
	};
	Dispatcher.handleViewAction( resetImportAction );

	apiStart();
	wpcom
		.updateImporter( siteId, createExpiryOrder( siteId, importerId ) )
		.then( apiSuccess )
		.then( fromApi )
		.then( receiveImporterStatus )
		.catch( apiFailure );
}

export function startMappingAuthors( importerId ) {
	const lockImportAction = {
		type: IMPORTS_IMPORT_LOCK,
		importerId,
	};
	Dispatcher.handleViewAction( lockImportAction );

	const startMappingAuthorsAction = {
		type: IMPORTS_AUTHORS_START_MAPPING,
		importerId,
	};
	Dispatcher.handleViewAction( startMappingAuthorsAction );
}

export const setUploadProgress = ( importerId, data ) => ( {
	type: IMPORTS_UPLOAD_SET_PROGRESS,
	uploadLoaded: data.uploadLoaded,
	uploadTotal: data.uploadTotal,
	importerId,
} );

export const startImport = ( siteId, importerType ) => {
	// Use a fake ID until the server returns the real one
	const importerId = `${ ID_GENERATOR_PREFIX }${ Math.round( Math.random() * 10000 ) }`;

	return {
		type: IMPORTS_IMPORT_START,
		importerId,
		importerType,
		siteId,
	};
};

export function startImporting( importerStatus ) {
	const {
		importerId,
		site: { ID: siteId },
	} = importerStatus;

	const unlockImportAction = { type: IMPORTS_IMPORT_UNLOCK, importerId };
	Dispatcher.handleViewAction( unlockImportAction );

	const startImportingAction = {
		type: IMPORTS_START_IMPORTING,
		importerId,
	};
	Dispatcher.handleViewAction( startImportingAction );

	wpcom.updateImporter( siteId, createImportOrder( importerStatus ) );
}

export const startUpload = ( importerStatus, file ) => dispatch => {
	const {
		importerId,
		site: { ID: siteId },
	} = importerStatus;
	const startUploadAction = {
		type: IMPORTS_UPLOAD_START,
		filename: file.name,
		importerId,
	};

	wpcom
		.uploadExportFile( siteId, {
			importStatus: toApi( importerStatus ),
			file,

			onprogress: event =>
				dispatch(
					setUploadProgress( importerId, {
						uploadLoaded: event.loaded,
						uploadTotal: event.total,
					} )
				),

			onabort: () => cancelImport( siteId, importerId ),
		} )
		.then( data => ( { ...data, siteId } ) )
		.then( fromApi )
		.then( data => {
			const finishUploadAction = {
				type: IMPORTS_UPLOAD_COMPLETED,
				importerId,
				importerStatus: fromApi( {
					...data,
					siteId,
				} ),
			};

			dispatch( finishUploadAction );
		} )
		.catch(
			flowRight(
				dispatch,
				failUpload( importerId )
			)
		);

	dispatch( startUploadAction );
};
