import {Promise} from "es6-promise";

/**
 * Retrive the content of the file at _url_
 * @param url
 * @returns {any}
 */
export function ajax(url: string): Promise<string> {
    "use strict";
    let xhttp: XMLHttpRequest;
    if (XMLHttpRequest) {
        xhttp = new XMLHttpRequest();
    } else if (ActiveXObject) {
        // for IE<7
        xhttp = new ActiveXObject("Microsoft.XMLHTTP");
    } else {
        return Promise.reject(new Error("XMLHttp not supported."));
    }
    return new Promise((resolve: (value: string) => void, reject: (error: any) => void) => {
        xhttp.onreadystatechange = () => {
            if (xhttp.readyState === XMLHttpRequest.DONE) {
                if (xhttp.status === 200) {
                    resolve(xhttp.responseText);
                } else {
                    //reject(new Error("AJAX error: '" + xhttp.statusText + "'"));
                    reject(new Error("Could not retrieve requested URL"));
                }
            }
        };
        xhttp.overrideMimeType("text/plain; charset=x-user-defined");
        xhttp.open("GET", url, true);
        xhttp.send();
    });
}
