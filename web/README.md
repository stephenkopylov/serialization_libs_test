# Serialization Performance Test - Web

Web version of the serialization performance test comparing JSON, MessagePack, and FlatBuffers.

## Setup

```bash
cd web
yarn install
```

## Development

```bash
yarn dev
```

Open http://localhost:3000 in your browser.

## Build

```bash
yarn build
```

## Notes

- Uses the same FlatBuffers schema as the React Native version
- All tests use the same structure: `{ foo: "bar", foo_number: i }`
- Tests run 10,000 iterations per format

