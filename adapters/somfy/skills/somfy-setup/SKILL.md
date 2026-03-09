# Somfy Setup Skill

Guide the user through connecting a Somfy TaHoma gateway to Holms. Follow these steps in order, confirming with the user at each stage.

## Step 1 — Pair (generate local API token)

The local API requires a bearer token generated via the Somfy cloud. The user only needs to provide their Somfy account credentials — the gateway is found automatically from the account.

1. Tell the user you'll need their Somfy account email and password to generate a local API token. Explain clearly:
   - The credentials are sent directly to Somfy's servers to generate a local token
   - The credentials are never stored by Holms
   - After this step, all communication is local (no cloud dependency)
2. Use `ask_user` to get their email address.
3. Use `ask_user` to get their password.
4. Call `adapters_pair({ type: "somfy", email: "<email>", password: "<password>" })`.

The pair call will automatically:
- Authenticate with the Somfy cloud
- List all gateways on the account
- Pick the first alive gateway (or use `gateway_pin` if multiple gateways and the user specifies one)
- Generate and activate a local API token

- If successful **with `host` in credentials**: the response contains `token`, `host`, and `gateway_pin`. **Use these values exactly as returned** in the next step — do not modify or substitute them.
- If successful **without `host` in credentials**: the gateway was not found on the local network. Use `ask_user` to ask the user for the local IP address of their TaHoma gateway (they can find it in their router's DHCP table or the TaHoma app). Then re-call `adapters_pair({ type: "somfy", email: "<email>", password: "<password>", address: "<ip>" })` — the token will be reused.
- If multiple gateways: the response includes a message listing all gateways. If the user wants a different one, re-call with `gateway_pin: "<pin>"`.
- If authentication fails: let the user know and offer to retry with different credentials. Common issues:
  - Wrong email/password
  - Account registered on a different Somfy server (try `server: "ha101-1.overkiz.com"` vs `"ha201-1.overkiz.com"`)
  - Account doesn't have the TaHoma gateway registered

## Step 2 — Configure adapter

Use the **exact credentials returned by `adapters_pair`** to configure the adapter. Do not invent or substitute values — pass `host`, `token`, and `gateway_pin` verbatim from the pair response:

```
adapters_configure({
  id: "somfy-1",
  type: "somfy",
  displayName: "<descriptive name>",
  config: {
    host: credentials.host,
    token: credentials.token,
    gateway_pin: credentials.gateway_pin
  }
})
```

Choose a descriptive `displayName` based on the gateway info (e.g. "Somfy TaHoma - Home", "TaHoma Gateway"). Do not ask the user — pick a sensible name automatically.

The adapter will start, connect to the local gateway, and register all discovered screens/shutters.

## Step 3 — Discover entities

Call `adapters_discover({ adapterId: "somfy-1" })` to see all entities the gateway reported.

Present the entities to the user grouped by type. For each entity, show:
- Name (label from TaHoma)
- Type (roller shutter, screen, blind, etc.)
- Supported features (position, tilt, stop, my_position)

## Step 4 — Create spaces

Use `ask_user` to let the user pick which screens/shutters to import (multi-select with one option per entity). Don't assume all should be imported.

For each selected entity, create a space and assign sources:

1. Create the space if it doesn't exist (the user may already have spaces from other adapters)
2. Use `spaces_assign` for each entity, choosing appropriate:
   - `sourceId`: descriptive slug like `"living-room-roller-shutter"`
   - `role`: based on the device type (roller_shutter, screen, blind, etc.)
   - `features`: copy from the discovered entity properties

## Step 5 — Verify

Call `observe` on one or two of the new spaces to confirm state is flowing correctly. Show the user the current position of their screens.

Suggest the user try:
- Moving a screen via `influence` to verify control works
- Using `stop` to verify they can halt movement
- Physically moving a screen to verify event polling picks up changes

## Troubleshooting

- **Token expired**: Local tokens can expire. Re-pair with `adapters_pair` to generate a new one.
- **Connection refused on port 8443**: Ensure the TaHoma gateway has the local API enabled (requires developer mode activation via somfy.com).
- **Screens missing**: Only cover-type devices (roller shutters, screens, blinds, awnings, curtains) are imported. Other TaHoma devices (sensors, heaters) are not handled by this adapter.
- **Position seems inverted**: Holms uses 0=closed, 100=open. If a screen shows position 100 when closed, check the Overkiz device type configuration.
- **Multiple gateways**: Run the full flow again with a different adapter ID (e.g. `"somfy-2"`).
