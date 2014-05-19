/** @jsx React.DOM */

var remote = require('./remote.js');

var reactDomRoot = document.querySelector('#container');

var stub = {
  locations: {
    locations: [
      {
        name: '515 Kitchen & Cocktails',
        fbId: 240545564672,
        photoURL: '',
        checkedInCount: 1,
        address1: '515 Cedar St',
        address2: 'Santa Cruz, CA 95060',
        distance: '.2 mi away'
      },
      {
        name: 'Cafe Mare',
        fbId: 269901256358819,
        photoURL: 'https://scontent-a-sjc.xx.fbcdn.net/hphotos-ash3/t31.0-8/p960x960/1074700_673818769300397_437853795_o.jpg',
        checkedInCount: 1,
        address1: '740 Front St, #100',
        address2: 'Santa Cruz, CA 95060',
        distance: '.2 mi away'
      },
      {
        name: 'MOTIV',
        fbId: 112468103763, // 204393176242846 was merged into page
        photoURL: 'https://scontent-a-sjc.xx.fbcdn.net/hphotos-ash2/t1.0-9/419945_10150719331073764_1700138881_n.jpg',
        checkedInCount: 4,
        address1: '1209 Pacific Ave.',
        address2: 'Santa Cruz, CA 95060',
        distance: '.1 mi away',
        promotion: {
          title: 'James Bond',
          message: 'Every 50th BarChat posted to our wall is rewarded with a swanky drink upgrade!'
        }
      },
      {
        name: 'The Red Room',
        fbId: 111627012207432,
        photoURL: 'https://fbcdn-sphotos-a-a.akamaihd.net/hphotos-ak-frc3/t1.0-9/10269644_676768595693268_7156454855741968687_n.jpg',
        checkedInCount: 4,
        address1: '343 Cedar St',
        address2: 'Santa Cruz, CA 95060',
        distance: '500 ft away',
        promotion: {
          title: 'Score Free Drinks',
          message: 'Every 50th BarChat posted to our wall scores the poster a free penny drink, courtesy of The Red Room!'
        }
      },
      {
        name: 'Rosie McCann’s',
        fbId: 1710649235,
        photoURL: '',
        checkedInCount: 1,
        address1: '1220 Pacific St',
        address2: 'Santa Cruz, CA 95060',
        distance: '.1 mi away'
      },
      {
        name: 'The Rush Inn',
        fbId: 460268814089550, // Alternate: 100000701335606
        photoURL: '',
        checkedInCount: 3,
        address1: '113 Knight St',
        address2: 'Santa Cruz, CA 95060',
        distance: '.2 mi away'
      }
    ]
  }
};



var app = {
  init: function () {
    var ReactScreens = require('../lib/react-screens/react-screens.jsx');

    this.screens = new ReactScreens(reactDomRoot);

    handleLocationsChange();
  }
};



var handleBack = function(){
  console.log('handleBack', this, arguments);
  app.screens.back();
};

var handleLocationsChange = function(){
  console.log('handleLocationsChange', this, arguments);
  var LocationsScreen = require('./screen/locations.jsx');
  var props = stub.locations;

  app.screens.addScreen(
    <LocationsScreen locations={props.locations} handleLocationChange={handleLocationChange}></LocationsScreen>
  );
};

var handleLocationChange = function (props) {
  console.log('handleLocationChange', this, arguments);

  var getPosts = remote.fb.getPosts.bind(remote.fb, props.fbId);

  var PostsScreen = require('./screen/posts.jsx');

  app.screens.addScreen(
    <PostsScreen name={props.name} checkedInCount={props.checkedInCount} address1={props.address1} address2={props.address2} promotion={props.promotion} posts={props.posts} fbId={props.fbId} handleBack={handleBack} user={remote.user} handleCreatePost={handleCreatePost} handlePostChange={handlePostChange} getPosts={getPosts} handleLove={handleLove}></PostsScreen>
  );
};

var handlePostChange = function (props) {
  console.log('handlePostChange', this, arguments);

  var PostScreen = require('./screen/post.jsx');

  app.screens.addScreen(
    <PostScreen location={props.location} from={props.from} time={props.time} post={props.post} likes={props.likes} comments={props.comments} user={remote.user} handleBack={handleBack}></PostScreen>
  );
};



var handleCreatePost = function (msg, pictureDataURI, refresh) {
  console.log('handleCreatePost', this, arguments);

  var post = {
    fbId: this.fbId,
    message: msg,
    pictureDataURI: pictureDataURI
  };

  remote.fb.createPost(
    post,
    function () {
      console.log('handleCreatePost success', this, arguments);
      window.setTimeout(refresh, 2000); // Todo: WTF, I don't think we should need to do this...
    },
    function (response) {
      console.error('handleCreatePost failure', this, arguments);
      alert('Todo: Handle createPost error: ' + JSON.stringify(response));
      refresh();
    }
  );
};

var handleLove = function (e, id, refresh) {
  console.log('handleLove', this, arguments);

  e.stopPropagation();

  remote.fb.like(
    id,
    refresh,
    function (msg) {
      console.error('app handleLove: boo', this, arguments);
      alert('Todo: handleLove error: ' + JSON.stringify(msg));
    }
  );
};



var continuePastWelcomeScreen = function(){
  window.removeEventListener('fbAndParseLoginSuccess', continuePastWelcomeScreen);

  // todo: remove below testing code; make FTU experience more "welcoming"!
  if (remote.user.ftu) console.log ('new user!');
  else console.log ('returning user!')

  app.init();
};

var showFirstScreen = function(){
  window.addEventListener('fbLoginNeeded', showWelcomeScreen);

  window.addEventListener('fbAndParseLoginSuccess', continuePastWelcomeScreen);

  remote.init();
}

var showWelcomeScreen = function(){
  window.removeEventListener('fbLoginNeeded', showWelcomeScreen);

  var WelcomeScreen = require('./screen/welcome.jsx');

  var handleLoginButton = function(){
    // Todo: visual indicator that things are happening

    remote.login();
  };

  React.renderComponent(
    <WelcomeScreen handleLoginButton={handleLoginButton}></WelcomeScreen>
    ,
    reactDomRoot
  );
}



// Init
showFirstScreen();