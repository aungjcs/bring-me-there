
Bring me there
=========

Simple automation for SPA testing.  
Just register jQuery selectors and run.  
It will **automatically waits network connection** and webpage navigation.

Here is a sample running at [todomvc](http://todomvc.com/examples/backbone/).

![running](https://raw.githubusercontent.com/sinpaout/bring-me-there/docs/docs/img/todos.gif)

Not only single page but also able to run on normal navigation pages.(But not stable yet)

## Support screenshot

> screenshot idea forked from this [app](http://mrcoles.com/full-page-screen-capture-chrome-extension/)

 - **check to screenshot**

![set-screenshot](https://raw.githubusercontent.com/sinpaout/bring-me-there/docs/docs/img/set-screenshot.png)

 - **screenshots will be download automatically**

![screenshot](https://raw.githubusercontent.com/sinpaout/bring-me-there/docs/docs/img/todos-screenshot.gif)

## Installing

[Chrome apps store](https://chrome.google.com/webstore/detail/bring-me-there/njaajmkbdpimegdlkhgegbfpnblppccj)

## Usage
 
 - Prepare your tasks on setting
 - Go to the page which you want to run automation on
 - Then click the run button of extension
 - Run by shortcut such `option+z` or `alt+z`. [More Info](https://craig.is/killing/mice)
  - We do not handle shortcut for all domain.  
    You have to register each domain in `Shortcuts available domains` first.

## Supported functions

Below type of function are supported.
Setting functions `text`, `val`, `html` will use jQuery's function for set value.

 - url
 - click
 - dblclick
 - text
 - val
  - `change` event will be dispatch automatically
 - html
 - event
  - set event type such `blur` and `focus` to data field 

## Get selector from browser

Open dev tools on browser.
Go to elements tab.
Select the element which one you want selector of it.
Right click and copy selector.

![selector from dev tools](https://github.com/sinpaout/bring-me-there/blob/docs/docs/img/collect-selector.png)

## Roadmap

 - Keep value and use on next task
 - More easier way to get selector



