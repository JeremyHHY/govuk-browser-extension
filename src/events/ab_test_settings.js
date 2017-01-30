// This script is executed in the background.
//
// - It sets the appropriate request headers like `GOVUK-ABTest-NewNavigation`
// so that applications in integration, staging and development will respond
// with the correct A/B variant. It gets the current variant from the meta tags.
// - Responds to messages to change the current A/B variant. It updates the
// headers it will send and set a cookie like Fastly would.
var abTestSettings = (function() {

  var abBucketStore = chrome.extension.getBackgroundPage().abBucketStore.createStore();

  function initialize(initialBuckets) {
    abBucketStore.addAbTests(initialBuckets);
    return abBucketStore.getAll();
  }

  function updateCookie(name, bucket, url) {
    var cookieName = "ABTest-" + name;

    chrome.cookies.get({name: cookieName, url: url}, function (cookie) {
      if (cookie) {
        cookie.value = bucket;

        var updatedCookie = {
          name: cookieName,
          value: bucket,
          url: url,
          path: cookie.path,
          expirationDate: cookie.expirationDate
        };

        chrome.cookies.set(updatedCookie);
      }
    });
  }

  function setBucket(testName, bucketName, url) {
    abBucketStore.setBucket(testName, bucketName);
    updateCookie(testName, bucketName, url);
  }

  function addAbHeaders(details) {
    var abTestBuckets = abBucketStore.getAll();

    Object.keys(abTestBuckets).map(function (abTestName) {
      details.requestHeaders.push({
        name: "GOVUK-ABTest-" + abTestName,
        value: abTestBuckets[abTestName]
      });
    });

    return {requestHeaders: details.requestHeaders};
  }

  chrome.webRequest.onBeforeSendHeaders.addListener(
    addAbHeaders,
    {urls: ["*://*.gov.uk/*"]},
    ["requestHeaders", "blocking"]
  );

  return {
    initialize: initialize,
    setBucket: setBucket
  };
}());
