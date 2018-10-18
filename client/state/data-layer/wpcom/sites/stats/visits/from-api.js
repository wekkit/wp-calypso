/** @format */

/**
 * Internal dependencies
 */
import makeJsonSchemaParser from 'lib/make-json-schema-parser';
import { parseChartData } from 'state/stats/lists/utils';
import responseSchema from './schema';

export function transform( input ) {
	const { unit } = input;
	return parseChartData( input ).map( count => ( { ...count, unit } ) );
}

export default makeJsonSchemaParser( responseSchema, transform );
