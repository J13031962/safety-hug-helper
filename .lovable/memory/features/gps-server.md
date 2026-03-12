Custom GPS server configuration and TCP command details

## Server
- IP: 192.99.16.163
- Port 8821/TCP - GPS devices connect here
- Port 3000/TCP - App connects here
- Port 8080/TCP - WebSocket for realtime
- All ports open by default
- Server emulates GPS signals (custom server, not Protrack365)

## Device
- Model: VT08F
- Protocol: GT06 binary protocol (0x78 0x78 start bits)

## Command Protocol (0x80 - Online Command)
- Packet: [0x78 0x78] [length] [0x80] [contentLen:4B] [serverFlag:4B] [command:ASCII] [lang:2B] [serial:2B] [CRC16:2B] [0x0D 0x0A]
- CRC-16/ITU (X.25): poly=0x1021, init=0xFFFF, xorOut=0xFFFF
- CRC calculated from packet length to serial number (inclusive)

## Relay Commands
- `poweroff#` = CUT power (activate relay / siren)
- `poweron#` = RESTORE power (deactivate relay)
- Commands are ASCII, must end with #
