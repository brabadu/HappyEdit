chrome.app.runtime.onLaunched.addListener(function (launchData) {
  chrome.app.window.create('index.html', {
      frame: 'none',
      width: 700,
      height: 700
  });
});
