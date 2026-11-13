/**
 * Class with helper methods to handle asynchronous JavaScript requests
 */
export class AJAX {
    /**
     * Retrieve the content of the file at url
     * @param url
     * @param timeout in milliseconds
     * @param abortSignal the signal of an AbortController. Its abort() cancels the request, and the promise is rejected
     *   with an Error whose name is "AbortError" (like fetch()).
     * @returns {any}
     */
    public static ajax(url: string, timeout: number = 9000, abortSignal?: AbortSignal): Promise<string> {
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
        xhttp.timeout = timeout;
        return new Promise((resolve: (value: string) => void, reject: (error: any) => void) => {
            if (abortSignal) {
                const abort: () => void = (): void => {
                    const error: Error = new Error("The request was aborted");
                    error.name = "AbortError";
                    reject(error); // before abort(), which sets the request to DONE with status 0
                    xhttp.abort();
                };
                if (abortSignal.aborted) {
                    abort();
                    return;
                }
                abortSignal.addEventListener("abort", abort, { once: true });
            }
            xhttp.onreadystatechange = (): void => {
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
            xhttp.ontimeout = (e): void => {
                // For IE and node
                reject(new Error("Server request Timeout"));
            };
            xhttp.overrideMimeType(mimeType);
            xhttp.open("GET", url, true);
            xhttp.send();
        });
    }
}
