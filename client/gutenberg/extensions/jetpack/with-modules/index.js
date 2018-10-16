/** @format */
/**
 * External dependencies
 */
import { Component } from '@wordpress/element';
import { createHigherOrderComponent } from '@wordpress/compose';
import { pick } from 'lodash';

/**
 * Add modules to Component props
 *
 * This is _not_ connect. This is a temporary solution until robust module data is exposed
 * in the components.
 *
 * @param  {Array<String>} moduleSlugs Array of module slugs
 * @return {Function}                  Function to wrap Component adding jetpackModules prop
 */
export default function withModules( moduleSlugs ) {
	return createHigherOrderComponent( WrappedComponent => {
		return class extends Component {
			render() {
				const jetpackModules = pick(
					'object' === typeof window && window.Jetpack_Initial_State.getModules,
					moduleSlugs
				);
				return <WrappedComponent { ...this.props } jetpackModules={ jetpackModules } />;
			}
		};
	}, 'withModules' );
}
