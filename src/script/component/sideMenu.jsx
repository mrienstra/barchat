/** @jsx React.DOM */

var React = require('react/addons');

// Modules
var pubSub = require('../pubSub.js');

// Mixins
var badgeMixin = require('../mixin/badge.js');

var SideMenu = React.createClass({
  mixins: [badgeMixin],
  propTypes: {
    handleActivityChange: React.PropTypes.func.isRequired,
    handleBack: React.PropTypes.func, // Not required
    handleMyProfileChange: React.PropTypes.func.isRequired,
    handleLogOut: React.PropTypes.func.isRequired,
    id: React.PropTypes.string.isRequired
  },
  render: function(){
    var badge;
    if (this.state.newCount) {
      badge = <div className="status badge badge-negative">{this.state.newCount}</div>;
    }

    return (
      <div id={this.props.id} className="side-menu">
        <div className="content">
          <ul className="table-view">
            <li className="table-view-cell">
              <a href={'#' + this.props.id} onTouchEnd={this.props.handleBack}>
                <h4><span className="icon ion-ios7-location"></span>Bars</h4>
              </a>
            </li>
            <li className="table-view-cell">
              <a onTouchEnd={this.props.handleMyProfileChange}>
                <h4><span className="icon ion-person"></span>Profile</h4>
              </a>
            </li>
            <li className="table-view-cell">
              <a className="activity" onTouchEnd={this.props.handleActivityChange}>
                <h4><span className="icon ion-star"></span>Activity</h4>
                {badge}
              </a>
            </li>
            <li className="table-view-cell hide">
              <a>
                <h4><span className="icon ion-gear-a"></span>Settings</h4>
              </a>
            </li>
            <li className="table-view-cell">
              <a onTouchEnd={this.props.handleLogOut}>
                <h4><span className="icon ion-log-out"></span>Log Out</h4>
              </a>
            </li>
          </ul>
        </div>
      </div>
    );
  }
});

module.exports = SideMenu;