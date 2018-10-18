/** @format */

/**
 * External dependencies
 */
import { get, omit, pick, set } from 'lodash';

/**
 * Internal dependencies
 */
import { combineReducers } from 'state/utils';
import { STATS_CHART_COUNTS_REQUEST, STATS_CHART_COUNTS_RECEIVE } from 'state/action-types';
import { counts as countsSchema, isLoading as isLoadingSchema } from './schema';
import { QUERY_FIELDS } from './utils';

/**
 * Returns the updated items state after an action has been dispatched. The
 * state maps site ID, post ID and stat keys to the value of the stat.
 *
 * @param  {Object} state  Current state
 * @param  {Object} action Action payload
 * @return {Object}        Updated state
 */
export function counts( state = {}, action ) {
	switch ( action.type ) {
		case STATS_CHART_COUNTS_RECEIVE: {
			const ID = 'period';
			const unit = get( action.data, `0.unit`, null );
			const countState = get( state, `${ action.siteId }.${ unit }`, [] );
			const countsById = countState.map( count => count[ ID ] );
			action.data.forEach( countFromApi => {
				const index = countsById.indexOf( countFromApi[ ID ] );
				if ( index >= 0 ) {
					countState[ index ] = omit( { ...countState[ index ], ...countFromApi }, 'unit' );
				} else {
					countState.push( countFromApi );
				}
			} );
			const newState = { ...state };
			set( newState, `${ action.siteId }.${ action.data[ 0 ].unit }`, countState );
			return newState;
		}
	}
	return state;
}
counts.schema = countsSchema;

export function isLoading( state = {}, action ) {
	switch ( action.type ) {
		case STATS_CHART_COUNTS_REQUEST: {
			const nextState = { ...state };
			action.statFields.forEach( statField => {
				set( nextState, `${ action.siteId }.${ statField }.${ action.period }`, true );
			} );
			return nextState;
		}
		case STATS_CHART_COUNTS_RECEIVE: {
			const nextState = { ...state };
			const period = get( action.data, `0.unit`, null );
			Object.keys( pick( action.data[ 0 ], QUERY_FIELDS ) ).forEach( statField => {
				set( nextState, `${ action.siteId }.${ statField }.${ period }`, false );
			} );
			return nextState;
		}
	}

	return state;
}
isLoading.schema = isLoadingSchema;

export default combineReducers( { counts, isLoading } );
