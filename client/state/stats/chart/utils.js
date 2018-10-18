/** @format */

/**
 * External dependencies
 */
import { omitBy, isNull, merge, memoize } from 'lodash';

export const QUERY_FIELDS = [ 'views', 'visitors', 'likes', 'comments', 'post_titles' ];

export const mergeQueryResults = memoize( function( results, id = 'period' ) {
	const combinedResults = new Map();
	results.forEach( resultsOfType => {
		resultsOfType.forEach( result => {
			const nextResult = combinedResults.has( result[ id ] )
				? merge( combinedResults.get( result[ id ] ), omitBy( result, isNull ) )
				: result;
			combinedResults.set( result[ id ], nextResult );
		} );
	} );
	return [ ...combinedResults.values() ];
} );
