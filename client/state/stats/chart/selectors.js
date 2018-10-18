/** @format */

/**
 * External dependencies
 */
import { get } from 'lodash';

/**
 * Internal dependencies
 */
import { QUERY_FIELDS } from 'state/stats/chart/utils';

/**
 * Returns the number of views for a given post, or `null`.
 *
 * @param   {Object}  state    Global state tree
 * @param   {Number}  siteId   Site ID
 * @param   {string}  period   Type of duration to include in the query (such as daily)
 * @returns {Array}            Array of count objects
 */
export function getChartCounts( state, siteId, period ) {
	return get( state, [ 'stats', 'chart', 'counts', siteId, period ], [] );
}

/**
 * Returns the number of views for a given post, or `null`.
 *
 * @param   {Object}  state    Global state tree
 * @param   {Number}  siteId   Site ID
 * @returns {Object}           Loading status object { [ type ]: { [ period ]: isLoading } }
 */
export function isChartCountLoading( state, siteId ) {
	return get( state, [ 'stats', 'chart', 'isLoading', siteId ] );
}

/**
 * Returns the number of views for a given post, or `null`.
 *
 * @param   {Object}  state    	Global state tree
 * @param   {Number}  siteId   	Site ID
 * @param   {string}  type 			Visitor count type, such as 'views' or 'post_titles'.
 * @param   {string}  period    Type of duration to include in the query (such as daily)
 * @returns {boolean}          	Is current chart tab count loading?
 */
export function isCurrentChartCountLoading( state, siteId, type, period ) {
	return get( isChartCountLoading( state, siteId ), [ type, period ], true );
}

/**
 * Returns the number of views for a given post, or `null`.
 *
 * @param   {Object}  state    Global state tree
 * @param   {Number}  siteId   Site ID
 * @param   {string}  period   Type of duration to include in the query (such as daily)
 * @returns {Array}          	 Array of stat types as strings
 */
export function getLoadingTabs( state, siteId, period ) {
	const areTabsLoading = isChartCountLoading( state, siteId );
	return QUERY_FIELDS.map( tab => get( areTabsLoading, [ tab, period ], true ) ).filter(
		isLoading => isLoading
	);
}
