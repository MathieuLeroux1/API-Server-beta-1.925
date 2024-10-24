import * as utilities from "./utilities.js";
import * as serverVariables from "./serverVariables.js";
import {log} from "./log.js"

let cacheExpirationTime = serverVariables.get("main.requestCache.expirationTime");

global.getRequestCaches = [];
global.cachedRequestsCleanerStarted = false;

export default class CachedRequestsManager {   
    static startCachedRequestsCleaner() {
        setInterval(CachedRequestsManager.flushExpired, cacheExpirationTime * 1000);
        console.log(BgWhite + FgBlue, "[Periodic repositories data caches cleaning process started...]");
    }

    static add(url, content, ETag = "", HttpContext) {
        if (!HttpContext.isCacheable) {
            console.log(BgWhite + FgBlue, `[Requête non cachable pour l'URL : ${url}]`);
            return;
        }
    
        if (!global.cachedRequestsCleanerStarted) {
            global.cachedRequestsCleanerStarted = true;
            CachedRequestsManager.startCachedRequestsCleaner();
        }
    
        if (url != "") {
            CachedRequestsManager.clear(url);
            global.getRequestCaches.push({
                url,
                content,
                ETag,
                Expire_Time: utilities.nowInSeconds() + cacheExpirationTime
            });
            console.log(BgWhite + FgBlue, `[Ajout dans la cache : URL = ${url}, ETag = ${ETag}]`);
        }
    }
    

    static find(url) {
        try {
            if (url) {
                for (let cache of global.getRequestCaches) {
                    console.log(cache)
                    if (cache.url === url) {
                        cache.Expire_Time = utilities.nowInSeconds() + cacheExpirationTime;
                        console.log(BgWhite + FgBlue, `[Extraction de la cache : URL = ${url}]`);
                        
                        return {
                            content: cache.content,
                            ETag: cache.ETag
                        };
                    }
                }
            }
        } catch (error) {
            console.log(BgWhite + FgRed, "[repository cache error!]", error);
        }
        return null;
    }

    static clear(url) {
        if (url) {
            global.getRequestCaches = global.getRequestCaches.filter(cache => cache.url !== url);
            console.log(BgWhite + FgBlue, `[Cache effacée pour l'URL : ${url}]`);
        }
    }

    static flushExpired() {
        let now = utilities.nowInSeconds();
        global.getRequestCaches = global.getRequestCaches.filter(cache => {
            if (cache.Expire_Time > now) {
                return true;
            } else {
                console.log(BgWhite + FgBlue, `[Retrait de cache expirée : URL = ${cache.url}]`);
                return false;
            }
        });
    }

    static get(HttpContext) {
        if (!HttpContext || !HttpContext.req || !HttpContext.req.url) {
            console.error("HttpContext ou HttpContext.request.url est indéfini");
            return false;
        }
        let cachedResponse = CachedRequestsManager.find(HttpContext.req.url);
        if (cachedResponse) {
            HttpContext.response.JSON(
                cachedResponse.content,
                cachedResponse.ETag,
                true 
            );
            return true; 
        }
        return false;
    }
}