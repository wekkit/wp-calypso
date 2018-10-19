/** @format */

/**
 * Internal dependencies
 */

import { combineReducers, withStorageKey } from 'state/utils';
import productList from './product-list/reducer';

export default withStorageKey(
	'simple-payments',
	combineReducers( {
		productList,
	} )
);
