
<!--img alt="Brought to you by PhonicScore" src="https://phonicscore.com/neu/wp-content/uploads/2018/06/phonicscore_brown.svg"/-->


# <img alt="OSMD logo" align="center" height="40" src="https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/assets/33069673/a83dc850-65c2-4c7a-8836-eb75cefc006f"/> OpenSheetMusicDisplay (OSMD)
<!--# <img alt="OSMD logo" align="center" src="https://opensheetmusicdisplay.org/wp-content/uploads/2016/05/OSMD_3_icon_only.svg"/> OpenSheetMusicDisplay (OSMD)-->
<!--- # <img alt="OSMD logo" align="center" src="https://opensheetmusicdisplay.org/wp-content/uploads/sites/2/2021/02/OSMD_logo_box.svg" height="40"/> OpenSheetMusicDisplay (OSMD) -->

<!--table style="table-layout: fixed; width:100%; border: none; border-collapse: collapse;">
  <tr>
    <td><img id="osmdlogo" alt="OpenSheetMusicDisplay (OSMD)" src="https://opensheetmusicdisplay.org/wp-content/uploads/2016/05/OSMD_3_icon_only.svg"/></td>
   <td style="text-align: center"><h1>OpenSheetMusicDisplay (OSMD)</h1></td>
    <td></td>
  </tr>
</table-->

### A MusicXML renderer for the Browser
[opensheetmusicdisplay.org](https://opensheetmusicdisplay.org/)<br>
[![Gitter](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/opensheetmusicdisplay/opensheetmusicdisplay?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)
[![Appveyor Build status](https://ci.appveyor.com/api/projects/status/r88lnffso55nq1ko?svg=true)](https://ci.appveyor.com/project/sebastianhaas/opensheetmusicdisplay/branch/master)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)<br>

<!-- [![Greenkeeper badge](https://badges.greenkeeper.io/opensheetmusicdisplay/opensheetmusicdisplay.svg)](https://greenkeeper.io/) --> <!-- move to Snyk -->
<!-- [![Dependency Status](https://david-dm.org/opensheetmusicdisplay/opensheetmusicdisplay/status.svg)](https://david-dm.org/opensheetmusicdisplay/opensheetmusicdisplay) --> <!-- often returns error "no healthy upstream" -->
<!-- [![Travis Build Status](https://travis-ci.org/opensheetmusicdisplay/opensheetmusicdisplay.svg?branch=master)](https://travis-ci.org/opensheetmusicdisplay/opensheetmusicdisplay) --> <!-- Migrate to travis-ci.com -->
[About OSMD](#about-osmd) • [Demo](#demo) • [Key Features](#key-features) • [Limitations](#limitations) • [How to Use OSMD](#how-to-use-osmd) • [Sponsor OSMD](#sponsor-osmd) • [About Us](#about-us) • [Get In Touch](#get-in-touch)

:star: - Star us on Github - It really helps us a lot!<br>
:pray: - [Become our Sponsor](#sponsor-osmd) - Support our work and receive awesome perks!

## About OSMD

<img title="How OSMD can look in the browser&#xA;(Mockup, OSMD on its own does not support playback)" src="https://user-images.githubusercontent.com/33069673/106186552-bd191300-61a4-11eb-8814-07019fcf1d5b.png" style="max-width: 100%; max-height: 100vh; width: auto; margin: auto;">

OpenSheetMusicDisplay renders MusicXML sheet music in the browser. It is the missing link between [MusicXML](https://www.musicxml.com/) and [VexFlow](https://www.vexflow.com/). Built upon many years of experience in both sheet music interactivity and engraving, it is the perfect solution for app developers seeking to build digital sheet music services.

[MusicXML](https://www.musicxml.com/) is the de facto standard for exchanging sheet music between music software.<br>
[VexFlow](https://www.vexflow.com/) is widely used for rendering sheet music. It features an extensive library of musical elements, but each measure and symbol has to be created and positioned by hand in Javascript.

OpenSheetMusicDisplay brings the two together and offers an open source turnkey solution for your digital sheet music project.

## Demo

Try the [Public Demo](https://opensheetmusicdisplay.github.io/demo/) to see what OSMD can do.<br>
[Learn more about the demo](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/wiki/Exploring-the-Demo) and OSMD in [the OSMD Wiki](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/wiki).

Developers can also run a [local development demo (see Wiki)](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/wiki/Debugging-(VSCode)):

<img title="Local OSMD Development/Debug demo" alt="Local OSMD Developer Demo" src="https://user-images.githubusercontent.com/33069673/106189263-5695f400-61a8-11eb-901f-aafc853af497.png" style="max-width: 100%; max-height: 100vh; width: auto; margin: auto;">


## Key Features

* Displays MusicXML sheet music in a browser(less) environment (Javascript, Typescript, server-side: browserless NodeJS script)
* *Soon: Audio Playback (work in progress, early access build available for [Github sponsors](https://github.com/sponsors/opensheetmusicdisplay))*
* Uses [Vexflow](https://www.vexflow.com/) for rendering and (partly) layout
* Parses most MusicXML tags and integrates it into an accessible and modifiable data model (e.g. to change a note's color)
* Offers many options ([OSMDOptions](https://opensheetmusicdisplay.github.io/classdoc/classes/OSMDOptions.html) / [EngravingRules](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/blob/master/src/MusicalScore/Graphical/EngravingRules.ts)): Page Format, Font Family, Positioning, not rendering certain elements like the title or lyrics, etc.
* Allows modification of the displayed score, like hiding parts or instruments, hiding instrument names, title or composer, a more compact layout, or coloring notes
* Outputs SVG or PNG, also via nodejs script in the command line, completely browserless (e.g. for server-side rendering)
* Written in [Typescript](https://www.typescriptlang.org/) with complete type information, 100% compatible with Javascript (minified build is .js)
* Can display tablature (guitar tabs) from MusicXML, including effects like bends and glissandi. Can be combined with treble clef.
<img src="https://user-images.githubusercontent.com/33069673/127324371-b7c5f137-a1b8-4127-95b0-38e6a185c906.png" height="130">


<p align="left">
  <img title="OSMD in the Browser"  src="https://user-images.githubusercontent.com/33069673/106321958-64fe1180-6275-11eb-8632-3b22beaa0829.jpg" width="66.4%">
&nbsp;
  <img title="OSMD on Mobile (or server-side rendering)" src="https://user-images.githubusercontent.com/33069673/106321963-67606b80-6275-11eb-8fdd-2acf273586df.jpg" width="25%">
</p>

## Limitations

Not all MusicXML tags are (fully) supported:
* Pedal marks (currently in early access for sponsors)
* Glissando lines
* Wavy-line (currently in early access for sponsors)
* Etc, see [OSMD 1.0 Project](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/projects/3)

Also, **OSMD is a renderer, not an interactive sheet music editor.** Rendering takes some time, and you can't easily/quickly move notes, place new notes, etc.<br>
(You can, however, manipulate the SVG nodes for instant changes like note re-coloring, see [Exploring the Demo | Wiki](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/wiki/Exploring-the-Demo))

## How to Use OSMD

* Available as [NPM module](https://www.npmjs.com/package/opensheetmusicdisplay), can be used with plain javascript or module managers like webpack
* [Getting Started: Detailed instructions in our Wiki](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/wiki/Getting-Started)
* If you have further technical questions, you can:
  * [Leave a comment in our Discussions section](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/discussions/950) (especially for questions of understanding)
  * [Browse through our Issues](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues?&q=is%3Aissue)
  * [Open a new issue](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/new/choose) (may be moved to Discussions).

## Sponsor OSMD and get early access to the audio player and more

<a href="https://github.com/sponsors/opensheetmusicdisplay/" alt="OSMD on Github Sponsors">
<!--img src="https://user-images.githubusercontent.com/33069673/104042293-99ccfa80-51da-11eb-9dc9-fac075a33224.png" height="200" alt="OSMD on Github Sponsors"--><img src="https://user-images.githubusercontent.com/33069673/109203612-a9150100-77a4-11eb-9b91-6692850dccab.png" style="max-width: 100%; max-height: 100vh; width: auto; margin: auto;">
</a><br>

It would be great if free software were sustainable on its own. But to keep on improving and developing OpenSheetMusicDisplay we need your support. Your monthly sponsorship subscription - especially if you are already actively using OSMD - would mean everything to us - it’s a stable way of enabling us to continue our work, and improve and expand OSMD.<br>
Features already available in early access:
* OSMD Audio Player
* Native modules + example projects (React Native, Kotlin/Android, Swift/iOS) - NEW!
* Jianpu Display (Numbered Musical Notation), with playback

Features in the making, potentially available in future:

* Annotations (Add custom text, music symbols, etc. to the score and export to and import from XML)
* and more (we're always working on OSMD improvements or additional features, just look at our release history / [changelog](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/blob/develop/CHANGELOG.md)!)

Besides the early access features, you can get other perks like a personal postcard from the team in Vienna. Check them out at [our GitHub sponsors page](https://github.com/sponsors/opensheetmusicdisplay).

<p align="left">
  <img title="OSMD Sponsor perks like this t-shirt" src="https://user-images.githubusercontent.com/33069673/106322343-084f2680-6276-11eb-985b-3aaa483db206.jpg" width="35%">
&nbsp;
  <img title="OSMD button sponsor perk" src="https://user-images.githubusercontent.com/33069673/106320576-5a427d00-6273-11eb-96b0-d2c7c4b19927.jpg" width="28.5%">
</p>

And there are other ways to contribute to the community - we plan on starting a blog and newsletter, and sharing our knowledge. We encourage our sponsors to bring up their desired features and pitch blog post ideas.

Though we highly recommend the sponsor route, you can also donate via Paypal:<br>

[![paypal](https://www.paypalobjects.com/en_US/i/btn/btn_donateCC_LG.gif)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=FPHCYVV2HH8VU)<br>
Any support is highly appreciated.

## About Us

OSMD is made by [Phonicscore](https://phonicscore.com/) - a music-tech company based in Vienna. We create solutions for musicians, sheet music publishers, app developers, music stores and researchers:

* Open source software
* Sheet Music Rendering Software
* Native & web apps: [PracticeBird for iOS](https://itunes.apple.com/us/app/practice-bird-pro/id1253492926?ls=1&mt=8) and [Android](https://play.google.com/store/apps/details?id=phonicscore.phonicscore_lite)

Our mission is to provide state of the art software solutions for building MusicXML apps and to include the community in a constant thrive for improvement. We want to take away the pain of building music software from scratch and offer a shortcut when it comes to building your next MusicXML sheet music application.

We also want to thank [our Github Contributors](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/graphs/contributors), who show that with open source many people come together to not only share but improve software.

## Get In Touch

<a href="https://twitter.com/osmdengine"><img title="OSMD on Twitter" src="https://img.shields.io/twitter/url?label=%40osmdengine&style=social&url=https%3A%2F%2Ftwitter.com%2Fosmdengine" align="center"></a> <a alt="OSMD on Facebook" href="https://www.facebook.com/opensheetmusicdisplay/"><img title="OSMD on Facebook" src="https://img.shields.io/twitter/url?label=Facebook&logo=facebook&style=social&url=https%3A%2F%2Fwww.facebook.com%2Fopensheetmusicdisplay%2F" align="center"></a> <a href="https://www.instagram.com/open_sheet_music_display/"><img title="OSMD on Instagram" src="https://img.shields.io/twitter/url?label=Instagram&logo=instagram&style=social&url=https%3A%2F%2Fwww.instagram.com%2Fopen_sheet_music_display%2F" align="center"></a> <a href="https://fwd.osmd.org/discord"><img title="OSMD Discord (chat) Server" src="https://img.shields.io/twitter/url?label=Discord&logo=discord&style=social&url=https%3A%2F%2Ffwd.osmd.org%2Fdiscord" align="center"></a>
<!-- the social button images were created via https://shields.io, search twitter in the top search bar, click on twitter url, set named logo e.g. to facebook -->

To contact us directly, you can:
* Use the [Contact form on opensheetmusicdisplay.org](https://opensheetmusicdisplay.org/contact/) to send a mail
* Send a mail to support@opensheetmusicdisplay.org
* Leave a (public) comment in our [Discussions section](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/discussions)
* [Join our Discord (chat) Server](https://fwd.osmd.org/discord)
* [Join the chat on Gitter](https://gitter.im/opensheetmusicdisplay/opensheetmusicdisplay).
