/** @format */
const _ = require( 'lodash' );
const path = require( 'path' );

const isCalypsoClient = process.env.CALYPSO_CLIENT === 'true';
const isCalypsoServer = process.env.CALYPSO_SERVER === 'true';
const isCalypso = isCalypsoClient || isCalypsoServer;

const modules = isCalypsoClient ? false : 'commonjs'; // only calypso should keep es6 modules
const codeSplit = require( './server/config' ).isEnabled( 'code-splitting' );

const babelEnv = [
	'@babel/env',
	{
		modules,
		targets: {
			browsers: [ 'last 2 versions', 'Safari >= 10', 'iOS >= 10', 'ie >= 11' ],
		},
		exclude: [ 'transform-classes', 'transform-template-literals' ], // transform-classes is added manually later.
		useBuiltIns: 'entry',
	},
];

if ( ! isCalypsoClient ) {
	babelEnv[ 1 ].targets = {
		node: 'current',
	};
	delete babelEnv.exclude;
}

const config = {
	presets: [ babelEnv, '@babel/stage-2', '@babel/react' ],
	plugins: _.compact( [
		// the two class transforms are to emulate exactly how babel 6 handled classes.
		// it very slightly diverges from spec but also is more concise.
		// see: http://new.babeljs.io/docs/en/next/v7-migration.html#babel-plugin-proposal-class-properties
		isCalypsoClient && [ '@babel/plugin-proposal-class-properties', { loose: true } ],
		isCalypsoClient && [ '@babel/plugin-transform-classes', { loose: false } ],
		isCalypsoClient && [ '@babel/plugin-transform-template-literals', { loose: true } ],
		! isCalypso && 'add-module-exports',
		isCalypso && [
			path.join(
				__dirname,
				'server',
				'bundler',
				'babel',
				'babel-plugin-transform-wpcalypso-async'
			),
			{ async: isCalypsoClient && codeSplit },
		],
		'@babel/plugin-proposal-export-default-from',
		[
			'@babel/transform-runtime',
			{
				helpers: true,
				polyfill: false,
				regenerator: false,
			},
		],
		isCalypsoClient && './inline-imports.js',
	] ),
	env: {
		test: {
			plugins: [ './server/bundler/babel/babel-lodash-es' ],
		},
	},
};

module.exports = config;
