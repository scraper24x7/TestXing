const Apify = require('apify');
const puppeteer = require('puppeteer');
require('./login-xing.js');

/*puppeteer.launch({headless: false, sloMo: 500 }).then(browser => {
	login_by_cookie_sync(browser, 1); // 0 - do not close browser
});*/

Apify.main(async () => { 
	//await login(); // we do init login and save cookie	
	var login_flag = false; 
    const requestQueue = await Apify.openRequestQueue(); 
    requestQueue.addRequest({ url: 'https://www.xing.com/companies' });
	//console.log('Request Queue:', requestQueue);
    const pseudoUrls = [new Apify.PseudoUrl('https://www.xing.com/companies/[.+]')];

    const crawler = new Apify.PuppeteerCrawler({
        requestQueue, 
		launchPuppeteerOptions: { slowMo: 70 } , 
		gotoFunction: async ({ request, page }) => { 			
			try { 
			    if (!login_flag) { // we login at the first request 
					login_flag = true;  
					await login_page(page);					
				} 				
				await page.goto(request.url, { timeout: 60000 });
			} catch (error){
				console.log('\nPage request error:', error);
			};  
		},
        handlePageFunction: async ({ request, page }) => {
            const title = await page.title();
            console.log(`Title of ${request.url}: ${title}`);
            await Apify.utils.enqueueLinks({ page, selector: 'a', pseudoUrls, requestQueue });
        },
        handleFailedRequestFunction: async ({ request }) => {
            console.log(`Request ${request.url} failed too many times`);
            await Apify.pushData({
                '#debug': Apify.utils.createRequestDebugInfo(request),
            });
        },
        maxRequestsPerCrawl: 8,
        maxConcurrency: 2,
    });

    await crawler.run();
	
	console.log('\nDeleting requestQueue');
	await requestQueue.delete();
});