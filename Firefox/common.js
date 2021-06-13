'use strict';

const prefs = {
    'blocked': ["https://hs.fi"],
    'initialBlock': true
}
    
const once = ["www.hs.fi"];
const ids = {};


const toHostname = url => {
    const s = url.indexOf('//') + 2;
    if (s > 1) {
      let o = url.indexOf('/', s);
      if (o > 0) {
        return url.substring(s, o);
      }
      else {
        o = url.indexOf('?', s);
        return o > 0 ? url.substring(s, o) : url.substring(s);
      }
    }
    return url;
  };

const observe = () => {
    if (prefs.blocked.length) {
      observe.build.direct();
  
      chrome.webRequest.onBeforeRequest.addListener(onBeforeRequestDirect, {
        'urls': ['*://*/*'],
        'types': ['main_frame', 'sub_frame']
      }, ['blocking']);

      chrome.tabs.onUpdated.addListener(onUpdatedDirect);
      // check already opened
      if (prefs.initialBlock) {
        chrome.tabs.query({
          url: '*://*/*'
        }, tabs => tabs.forEach(tab => onUpdatedDirect(tab.id, tab)));
      }
    }

};

let directPattern = [];

observe.build = {
    direct() {
      directPattern = prefs.blocked.filter(a => a).map(observe.wildcard).map(observe.regexp);
    },
};

observe.wildcard = h => {
    if (h.indexOf('://') === -1 && h.startsWith('R:') === false) {
      return `*://${h}/*`;
    }
    return h;
  };

observe.regexp = rule => {
    if (rule.startsWith('R:')) {
      return new RegExp(rule.substr(2), 'i');
    }
    const escapeRegexp = str => {
      const specials = [
        // order matters for these
        '-', '[', ']',
        // order doesn't matter for any of these
        '/', '{', '}', '(', ')', '*', '+', '?', '.', '\\', '^', '$', '|'
      ];
      const regex = RegExp('[' + specials.join('\\') + ']', 'g');
      return str.replace(regex, '\\$&');
    };
    return new RegExp('^' + rule.split('*').map(escapeRegexp).join('.*') + '$', 'i');
  };



const onBeforeRequest = d => {
    const hostname = toHostname(d.url);
    if (once.length) {
      const index = once.indexOf(hostname);
      if (index !== -1) {

        if (!(hostname in ids)) {
          ids[hostname] = window.setTimeout(() => {
            once.splice(index, 1);
            delete ids[hostname];
          }, prefs.timeout * 1000);
        }
        return true;
      }
    }
}

const onBeforeRequestDirect = d => {
 //   for (const rule of directPattern) {
  //    if (rule.test(d.url)) {
    //    console.log("Found match");
        return onBeforeRequest(d);
   //   }
  //  }
  };

  const onUpdatedDirect = (tabId, changeInfo) => {

    if (changeInfo.url && ['http', 'file', 'ftp'].some(s => changeInfo.url.startsWith(s))) {
      const rtn = onBeforeRequestDirect(changeInfo);
    console.log(rtn + " " + changeInfo.url);
      if (rtn){
       //&& rtn.redirectUrl) {
        chrome.tabs.update(tabId, {
        url : "https://cmx.fi"
            //   url: rtn.redirectUrl
        });
      }
    }
  };
  
chrome.storage.local.get(prefs, p => {
    const next = () => {
      Object.assign(prefs, p);
     // schedule.build();
      observe();
      //contextmenu.build();
    };

    try {
        chrome.storage.managed.get({
          json: ''
        }, rps => {
          if (!chrome.runtime.lastError && rps.json) {
            try {
              rps = JSON.parse(rps.json);
              if (p.guid !== rps.guid || rps['managed.storage.overwrite.on.start'] === true) {
                p = Object.assign(prefs, rps);
                chrome.storage.local.set(p);
                console.warn('Your preferences are configured by the admin');
              }
            }
            catch (e) {
              console.warn('cannot parse the managed JSON string');
            }
          }
          next();
        });
      }
      catch (e) {
        next();
      }
});

// chrome.browserAction.onClicked.addListener(tab => {
//     userAction(tab.id, tab.url, 0);
//   });