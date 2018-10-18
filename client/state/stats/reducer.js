/** @format */

/**
 * Internal dependencies
 */

import posts from './posts/reducer';
import { combineReducers } from 'state/utils';
import lists from './lists/reducer';
import recentPostViews from './recent-post-views/reducer';
import chart from './chart/reducer';

export default combineReducers( {
	chart,
	posts,
	lists,
	recentPostViews,
} );
