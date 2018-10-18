/** @format */

/**
 * External dependencies
 */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { flowRight } from 'lodash';
import { connect } from 'react-redux';
import { localize } from 'i18n-calypso';

/**
 * Internal dependencies
 */
import compareProps from 'lib/compare-props';
import Chart from 'components/chart';
import Legend from 'components/chart/legend';
import StatTabs from '../stats-tabs';
import StatsModulePlaceholder from '../stats-module/placeholder';
import Card from 'components/card';
import { getSelectedSiteId } from 'state/ui/selectors';
import { recordGoogleEvent } from 'state/analytics/actions';
import { getSiteOption } from 'state/sites/selectors';
import { requestChartCounts } from 'state/stats/chart/actions';
import { getChartCounts, getLoadingTabs } from 'state/stats/chart/selectors';
import { QUERY_FIELDS } from 'state/stats/chart/utils';
import { formatDate, getQueryDate } from './utility';

class StatModuleChartTabs extends Component {
	static propTypes = {
		activeLegend: PropTypes.arrayOf( PropTypes.string ),
		activeTab: PropTypes.shape( {
			attr: PropTypes.string,
			gridicon: PropTypes.string,
			label: PropTypes.string,
			legendOptions: PropTypes.arrayOf( PropTypes.string ),
		} ),
		availableLegend: PropTypes.arrayOf( PropTypes.string ),
		charts: PropTypes.arrayOf(
			PropTypes.shape( {
				attr: PropTypes.string,
				gridicon: PropTypes.string,
				label: PropTypes.string,
				legendOptions: PropTypes.arrayOf( PropTypes.string ),
			} )
		),
		data: PropTypes.arrayOf(
			PropTypes.shape( {
				comments: PropTypes.number,
				labelDay: PropTypes.string,
				likes: PropTypes.number,
				period: PropTypes.string,
				posts: PropTypes.number,
				visitors: PropTypes.number,
				visits: PropTypes.number,
			} )
		),
		isActiveTabLoading: PropTypes.bool,
		onChangeLegend: PropTypes.func.isRequired,
	};

	componentDidMount() {
		this.props.query && this.props.requestChartCounts( this.props.query );
	}

	componentDidUpdate( prevProps ) {
		if ( this.props.query && prevProps.queryKey !== this.props.queryKey ) {
			this.props.requestChartCounts( this.props.query );
		}
	}

	buildTooltipData( item ) {
		const tooltipData = [];

		const dateLabel = formatDate( item.data.period, this.props.period.period );
		tooltipData.push( {
			label: dateLabel,
			className: 'is-date-label',
			value: null,
		} );

		switch ( this.props.chartTab ) {
			case 'comments':
				tooltipData.push( {
					label: this.props.translate( 'Comments' ),
					value: this.props.numberFormat( item.value ),
					className: 'is-comments',
					icon: 'comment',
				} );
				break;

			case 'likes':
				tooltipData.push( {
					label: this.props.translate( 'Likes' ),
					value: this.props.numberFormat( item.value ),
					className: 'is-likes',
					icon: 'star',
				} );
				break;

			default:
				tooltipData.push( {
					label: this.props.translate( 'Views' ),
					value: this.props.numberFormat( item.data.views ),
					className: 'is-views',
					icon: 'visible',
				} );
				tooltipData.push( {
					label: this.props.translate( 'Visitors' ),
					value: this.props.numberFormat( item.data.visitors ),
					className: 'is-visitors',
					icon: 'user',
				} );
				tooltipData.push( {
					label: this.props.translate( 'Views Per Visitor' ),
					value: this.props.numberFormat( item.data.views / item.data.visitors, { decimals: 2 } ),
					className: 'is-views-per-visitor',
					icon: 'chevron-right',
				} );

				if ( item.data.post_titles && item.data.post_titles.length ) {
					// only show two post titles
					if ( item.data.post_titles.length > 2 ) {
						tooltipData.push( {
							label: this.props.translate( 'Posts Published' ),
							value: this.props.numberFormat( item.data.post_titles.length ),
							className: 'is-published-nolist',
							icon: 'posts',
						} );
					} else {
						tooltipData.push( {
							label:
								this.props.translate( 'Post Published', 'Posts Published', {
									textOnly: true,
									count: item.data.post_titles.length,
								} ) + ':',
							className: 'is-published',
							icon: 'posts',
							value: '',
						} );
						item.data.post_titles.forEach( post_title => {
							tooltipData.push( {
								className: 'is-published-item',
								label: post_title,
							} );
						} );
					}
				}
				break;
		}

		return tooltipData;
	}

	onLegendClick = chartItem => {
		const activeLegend = this.props.activeLegend.slice();
		const chartIndex = activeLegend.indexOf( chartItem );
		let gaEventAction;
		if ( -1 === chartIndex ) {
			activeLegend.push( chartItem );
			gaEventAction = ' on';
		} else {
			activeLegend.splice( chartIndex );
			gaEventAction = ' off';
		}
		this.props.recordGoogleEvent(
			'Stats',
			`Toggled Nested Chart ${ chartItem } ${ gaEventAction }`
		);
		this.props.onChangeLegend( activeLegend );
	};

	buildChartData() {
		const { data } = this.props;
		if ( ! data ) {
			return [];
		}

		const labelKey =
			'label' +
			this.props.period.period.charAt( 0 ).toUpperCase() +
			this.props.period.period.slice( 1 );
		return data.map( record => {
			let recordClassName;
			if ( record.classNames && record.classNames.length ) {
				recordClassName = record.classNames.join( ' ' );
			}

			const { activeLegend } = this.props;
			let nestedValue;
			if ( activeLegend.length ) {
				nestedValue = record[ activeLegend[ 0 ] ];
			}

			const className = classNames( recordClassName, {
				'is-selected': record.period === this.props.queryDate,
			} );

			const item = {
				label: record[ labelKey ],
				value: record[ this.props.chartTab ],
				data: record,
				nestedValue,
				className,
			};
			item.tooltipData = this.buildTooltipData( item );

			return item;
		} );
	}

	render() {
		const { isActiveTabLoading } = this.props;
		const classes = [ 'stats-module', 'is-chart-tabs', { 'is-loading': isActiveTabLoading } ];

		return (
			<Card className={ classNames( ...classes ) }>
				<Legend
					activeCharts={ this.props.activeLegend }
					activeTab={ this.props.activeTab }
					availableCharts={ this.props.availableLegend }
					clickHandler={ this.onLegendClick }
					tabs={ this.props.charts }
				/>
				{ /* eslint-disable-next-line wpcalypso/jsx-classname-namespace */ }
				<StatsModulePlaceholder className="is-chart" isLoading={ isActiveTabLoading } />
				<Chart
					barClick={ this.props.barClick }
					data={ this.buildChartData() }
					loading={ isActiveTabLoading }
				/>
				<StatTabs
					data={ this.props.data }
					tabs={ this.props.charts }
					switchTab={ this.props.switchTab }
					selectedTab={ this.props.chartTab }
					activeIndex={ this.props.queryDate }
					activeKey="period"
				/>
			</Card>
		);
	}
}

const NO_SITE_STATE = {
	siteId: null,
	data: [],
};

const connectComponent = connect(
	( state, { period: { period }, chartTab, queryDate } ) => {
		const siteId = getSelectedSiteId( state );
		if ( ! siteId ) {
			return NO_SITE_STATE;
		}

		const data = getChartCounts( state, siteId, period );
		const loadingTabs = getLoadingTabs( state, siteId, period );
		const isActiveTabLoading = loadingTabs.includes( chartTab );
		const quantity = 'year' === period ? 10 : 30;
		const timezoneOffset = getSiteOption( state, siteId, 'gmt_offset' ) || 0;
		const date = getQueryDate( queryDate, timezoneOffset, period, quantity );
		const queryKey = `${ date }-${ period }-${ quantity }-${ siteId }`;
		const query = {
			date,
			period,
			quantity,
			siteId,
			statFields: QUERY_FIELDS,
		};

		return { data, loadingTabs, isActiveTabLoading, queryKey, query, siteId };
	},
	{ recordGoogleEvent, requestChartCounts },
	null,
	{
		areStatePropsEqual: compareProps( {
			shallow: [ 'loadingTabs', 'activeTab', 'isActiveTabLoading' ],
			deep: [ 'query' ],
		} ),
	}
);

export default flowRight(
	localize,
	connectComponent
)( StatModuleChartTabs );
