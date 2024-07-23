# homebridge-twiline

</span>

[Twiline](https://twiline.com/) plugin for [HomeBridge](https://github.com/AndreasOttiger/homebridge-twiline) using TCP Sockets.

This plugin publishes configured activities to integrate TWILINE with HomeKit. It makes use of TWILINEs TCP gateway.

## Requirements
To use this plugin you need:

- a TWILINE installation (obviously)
  - an configured TCP gateway where you know the configured references
  - the corresponding license (xSL-CONNECT), talk to your TWILINE provider
- HomeBridge installed and running
  - I only tested it with the [Homebridge UI](https://github.com/homebridge/homebridge-config-ui-x) plugin for configuration

## Functionality
The plugin currently only offers a limited subset of functionality. I might add additional features later.

Base functionality:

- configuration of IP and port of the TCP gateway
- continuous reconnect tries if the connection to the TCP gateway is lost
- configuration of all accessories (as I understood the documentation there is no way to automatically discover the TWILINE accessories)
- handling configured accessories and passing messages from the TCP gateway to the correct accessory

Accessories:

- Light: can be simply turned on and off again, has a status
- Scene: similar to the light, with some difference in setting the state
- Stateless Switch: you can map a TWILINE item like a physical switch (with no status except pressed or not) to the TCP gateway. You can then send `ON`/`OFF` commands to that switch which is interpreted as pressing/releasing the button. That way you can easily access every functionality TWILINE has already organized in its software and assigned to a switch. Just simulate pressing that switch.
- Blind: can be set a target position, opened and closed. The functionality for setting angles is not (yet) implemented
- Window: can be set a target position, opened and closed. TWILINE uses blinds in the background/on the TCP gateway.

## Usage

Configuration:

- general: add your TWILINE TCP gateway IP and port
- Configure all accessories
  - use the reference specified in the configuration of the TCP gateway. These references uniquely define the TWILINE items.
  - you can specify a descriptive name as well, should not be strictly necessary though.

## Note

- Use at your own risk.
- I seriously lack experience in TypeScript, JavaScript, npm and all that stuff (including even GIT). Add HomeBridge, its plugin development, interacting with HomeKit to that list. My goal is being able to integrate TWILINE for myself. It definitely will not be a perfect piece of software.

## Known Limitations/Issues/Todo-list
- When for example turning multiple lights on with HomeKit the plugin doesn't handle that correctly. Only none or one of the lights gets turned on.
- The plugin supplies the names to HomeKit the wrong way round (References instead of names are getting used).
- Blinds and windows look always "turned on" in HomeKit
- The state of blinds, windows, ... at HomeBridge startup are wrong.
- As there is no synchronous way of getting a TWILINE items status, my way of getting the status is posting a `SEND_ME_STATE` message and hoping that the state is correctly handled.
- Even after the blinds have reached their destination a final update from TWILINE seems to take quite some time, therefore HomeBridge is displaying a status that is out of sync.
- No automated tests. Old school. :-o