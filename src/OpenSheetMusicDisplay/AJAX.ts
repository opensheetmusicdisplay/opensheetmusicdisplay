/**
 * Class with helper methods to handle asynchronous JavaScript requests
 */
export class AJAX {
    /**
     * Retrieve the content of the file at url
     * @param url
     * @returns {any}
     */
    public static ajax(url: string): Promise<string> {
        let xhttp: XMLHttpRequest;
        const mimeType: string = url.indexOf(".mxl") > -1 ? "text/plain; charset=x-user-defined" : "application/xml";
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
                    } else if (xhttp.status === 0 && xhttp.responseText) {
                        resolve(xhttp.responseText);
                    } else {
                        //reject(new Error("AJAX error: '" + xhttp.statusText + "'"));
                        reject(new Error("Could not retrieve requested URL " + xhttp.status));
                    }
                }
            };
            xhttp.ontimeout = (e) => {
                // For IE and node
                reject(new Error("Server request Timeout"));
            };
            xhttp.overrideMimeType(mimeType);
            xhttp.open("GET", url, true);
            xhttp.send();
        });
    }
}
