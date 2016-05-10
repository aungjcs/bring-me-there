
Bring me there
=========

Simple automation for SPA testing.  
Just register jQuery selectors and run.  
It will **automatically waits network connection** and webpage navigation.

Here is running at ionic framework site.

![running](https://raw.githubusercontent.com/sinpaout/bring-me-there/docs/docs/img/running.gif)

Not only single page but also able to run on normal navigation pages.(But not stable yet)

##Installing

[Chrome apps store](https://chrome.google.com/webstore/detail/bring-me-there/njaajmkbdpimegdlkhgegbfpnblppccj)

## Usage
 
 - Prepare your tasks on setting
 - Go to the page which you want to run automation on
 - Then click the run button of extension

## Supported functions

Below type of function are supported.
Setting functions `text`, `val`, `html` will use jQuery's function for set value.

 - url
 - click
 - dblclick
 - text
 - val
 - html

## Get selector from browser

Open dev tools on browser.
Go to elements tab.
Select the element which one you want selector of it.
Right click and copy selector.

![selector from dev tools](https://github.com/sinpaout/bring-me-there/blob/docs/docs/img/collect-selector.png)

## Roadmap

 - Support screen capture, [idea from this app](http://mrcoles.com/full-page-screen-capture-chrome-extension/)
 - Keep value and use on next task
 - More easier way to get selector
 - Run by shortcuts



