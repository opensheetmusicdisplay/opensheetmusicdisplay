
<!--img alt="Brought to you by PhonicScore" src="https://phonicscore.com/neu/wp-content/uploads/2018/06/phonicscore_brown.svg"/-->

# <h1> <img alt="OSMD logo" src="https://opensheetmusicdisplay.org/wp-content/uploads/2016/05/OSMD_3_icon_only.svg"/> OpenSheetMusicDisplay</h1>
### A MusicXML renderer for the Browser

[![Gitter](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/opensheetmusicdisplay/opensheetmusicdisplay?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)
[![Appveyor Build status](https://ci.appveyor.com/api/projects/status/r88lnffso55nq1ko?svg=true)](https://ci.appveyor.com/project/sebastianhaas/opensheetmusicdisplay/branch/master)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)<br>
[opensheetmusicdisplay.org](https://opensheetmusicdisplay.org/)
<!-- [![Greenkeeper badge](https://badges.greenkeeper.io/opensheetmusicdisplay/opensheetmusicdisplay.svg)](https://greenkeeper.io/) --> <!-- move to Snyk -->
<!-- [![Dependency Status](https://david-dm.org/opensheetmusicdisplay/opensheetmusicdisplay/status.svg)](https://david-dm.org/opensheetmusicdisplay/opensheetmusicdisplay) --> <!-- often returns error "no healthy upstream" -->
<!-- [![Travis Build Status](https://travis-ci.org/opensheetmusicdisplay/opensheetmusicdisplay.svg?branch=master)](https://travis-ci.org/opensheetmusicdisplay/opensheetmusicdisplay) --> <!-- Migrate to travis-ci.com -->
[Introduction](#introduction) • [Demo](#demo) • [Key Features](#key-features) • [Limitations](#limitations) • [How to Use OSMD](#how-to-use-osmd) • [Sponsor OSMD](#sponsor-osmd) • [About Us](#about-us) • [Contact](#contact)

## Introduction

<img width="500" src="https://user-images.githubusercontent.com/33069673/106186552-bd191300-61a4-11eb-8814-07019fcf1d5b.png">

OpenSheetMusicDisplay renders MusicXML sheet music in the browser. It is the missing link between MusicXML and VexFlow. Built upon many years of experience in both sheet music interactivity and engraving, it is the perfect solution for app developers seeking to build digital sheet music services.

MusicXML is the de facto standard for sharing sheet music on the internet. VexFlow is widely used for rendering sheet music. It features an extensive library of musical elements, but each measure and symbol has to be created and positioned by hand in Javascript.

OpenSheetMusicDisplay brings the two together and offers an open source turnkey solution for your digital sheet music project.

## Demo

Try the [Public Demo](https://opensheetmusicdisplay.github.io/demo/) to see what OSMD can do.<br>
[Learn more about the demo](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/wiki/Exploring-the-Demo) and OSMD in [the OSMD Wiki](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/wiki).

Developers can also build a [local development demo (see Wiki)](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/wiki/Debugging-(VSCode)):

<img width="400" alt="Local OSMD Developer Demo" src="https://user-images.githubusercontent.com/33069673/106189263-5695f400-61a8-11eb-901f-aafc853af497.png">


## Key Features

* Displays MusicXML sheet music in a browser environment (Javascript, Typescript, NodeJS command line/server)
* Parses most MusicXML tags and integrates it into an accessible and modifiable data model (e.g. to change a note's color)
* Offers many options (OSMDOptions / EngravingRules): Page Format, Font Family, Positioning, not rendering certain elements, etc.
* Allows modification of the displayed score, like hiding parts or instruments, hiding title and composer, a more compact layout, or coloring notes
* Outputs SVG or PNG, also via nodejs script in the command line, completely browserless

## Limitations

Not all MusicXML tags are (fully) supported:
* Pedal marks
* Glissando lines
* Wavy-line
* Etc, see [OSMD 1.0 Project](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/projects/3)

Also, OSMD is not an interactive sheet music editor. Rendering takes some time, and you can't easily/quickly move notes, place new notes, etc.

## How to Use OSMD

* Available as [NPM module](https://www.npmjs.com/package/opensheetmusicdisplay), can be used with plain javascript or module managers like webpack
* [Detailed instructions in our Wiki](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/wiki/Getting-Started)
* If you have further technical questions, you can:
  * [Leave a comment in our Discussions section](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/discussions/950) (especially for questions of understanding)
  * [Browse through our Issues](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues?&q=is%3Aissue)
  * [Open a new issue](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/new/choose) (may be moved to Discussions).

## Sponsor OSMD

<a href="https://github.com/sponsors/opensheetmusicdisplay/" alt="OSMD on Github Sponsors">
<img src="https://user-images.githubusercontent.com/33069673/104042293-99ccfa80-51da-11eb-9dc9-fac075a33224.png" height="200" alt="OSMD on Github Sponsors">
</a><br>

Sadly free isn’t sustainable on its own. To keep on improving and developing Open Sheet Music Display we need your support. Your monthly sponsorship subscription - especially if you are already actively using OSMD - would mean everything to us - it’s a stable way that would enable us to continue our work, improve and bugfix Open Sheet Music Display.<br>
New features currently in the making are:
* OSMD Audio Player
* Transposing Plugin
* Annotations (Add custom text, music symbols, etc. to the score and export to and import from XML)

Our awesome sponsors get awesome perks, like:
* Early Access to features like the Audio Player
* A postcard from Vienna

and others. Check them out at [our GitHub sponsors page](https://github.com/sponsors/opensheetmusicdisplay).

And there are other ways to contribute to the community - we plan on starting a blog & a newsletter and share our knowledge. We encourage our sponsors to bring up their desired features and pitch blog post ideas.

Though we highly recommend the sponsor route, you can also donate via Paypal:<br>

[![paypal](https://www.paypalobjects.com/en_US/i/btn/btn_donateCC_LG.gif)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=FPHCYVV2HH8VU)<br>
Any support is highly appreciated.

## About Us

OSMD is made by [Phonicscore](https://phonicscore.com/) - a music-tech company based in Vienna. We create solutions for musicians, sheet music publishers, app developers, music stores and researchers.

* Open source software
* Sheet Music Rendering Software
* Native & web browser apps: [PracticeBird for iOS](https://itunes.apple.com/us/app/practice-bird-pro/id1253492926?ls=1&mt=8) and [Android](https://play.google.com/store/apps/details?id=phonicscore.phonicscore_lite)

Our mission is to provide a state of art software solution for building MusicXML apps and to include the community in a constant thrive for improvement. We want to take away the pain of building music software from scratch and offer a shortcut when it comes to building your next MusicXML sheet music application.

We also want to thank [our Github Contributors](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/graphs/contributors), who show with open source many people come together to not only share but improve software.

## Contact

To contact us directly, you can:
* Use the [Contact form on opensheetmusicdisplay.org](https://opensheetmusicdisplay.org/contact/) to send a mail
* Leave a (public) comment in our [Discussions section](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/discussions)
* [Join our Discord (chat) Server](https://osmd.org/discord)
* [Join the chat on Gitter](https://gitter.im/opensheetmusicdisplay/opensheetmusicdisplay).
