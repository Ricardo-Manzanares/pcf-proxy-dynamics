# pcf-proxy-dynamics #

This package provides a lightweight Web API proxy that enables local
React development for PCF components without requiring a running
Dynamics 365 environment. It lets you build, debug, and test your
component logic in real time, avoiding the heavy deploy-test cycle.

📑 Table of Contents
1. [Installation](#1-installation)
2. [Runtime Switch (Local vs Dataverse)](#2-runtime-switch-local-vs-dataverse)
3. [Strongly Typed Props Interface](#3-strongly-typed-props-interface)
4. [Component Usage](#4-component-usage)
5. [Minimal Pattern](#5-minimal-pattern)
6. [Recommended Development Flow](#6-recommended-development-flow)
7. [Notes](#7-notes)
8. [Troubleshooting](#8-troubleshooting)
9. [Environment Configuration (.env)](#9-environment-configuration-env)
10. [Extension Suggestion](#10-extension-suggestion)


## 1. Installation
```js
    npm i @axazure/pcf-proxy-dynamics
```
Add the backend script if it’s missing:
```js
    "start:backend": "node ./node_modules/@axazure/pcf-proxy-dynamics/dist/server.js"
```
Start your local dev environment:
```{r, engine='bash', count_lines}
    npm run start:backend
    npm run start
```
Proxy base URL: http://localhost:3001

## 2. Runtime Switch (Local vs Dataverse)
```js
    var _api : ComponentFramework.WebApi;
    var _userSettings, _recordId, _entityName;

    if (document.location.host.includes('localhost')) {
      const { WebApiProxy } = require("@axazure/pcf-proxy-dynamics");
      _api = new WebApiProxy("http://localhost:3001");
      _userSettings = {} as ComponentFramework.UserSettings;
      _userSettings.userId = "00000000-0000-0000-0000-000000000000";
      _recordId = "00000000-0000-0000-0000-000000000000";
      _entityName = "";
    } else {
      _api = context.webAPI;
      _userSettings = context.userSettings;
      _userSettings.userId = (<any>_userSettings).userId;
      _recordId = (<any>context).page.entityId.replace("{", "").replace("}", "") ?? "";
      _entityName = (<any>context).page.entityTypeName ?? "";
    }
```
## 3. Strongly Typed Props Interface
```js
    export interface IGenericComponentProps {
      webAPI: ComponentFramework.WebApi;
      recordId: string;
      entityName: string;
      userSettings: ComponentFramework.UserSettings;
    }
```

## 4. Component Usage

### Root component
```js
    import * as React from "react";
    import { IGenericComponentProps } from "../lib/props";

    export const GenericComponent: React.FC<IGenericComponentProps> = ({ webAPI, recordId, entityName, userSettings }) => {
      return (
        <div>
          <h3>Generic Component</h3>
          <div>Record Id: {recordId}</div>
          <div>Entity: {entityName}</div>
          <div>User Id: {userSettings.userId}</div>
        </div>
      );
    };
```

### Integration in index.ts
```js
    import { IGenericComponentProps } from "./lib/props";
    import { GenericComponent } from "./components/generic-component";

    public updateView(context: ComponentFramework.Context<IInputs>): React.ReactElement {
        var _api: ComponentFramework.WebApi;
        var _userSettings, _recordId, _entityName = null;

        if (document.location.host.includes('localhost')) {
            const { WebApiProxy } = require("@axazure/pcf-proxy-dynamics");
            _api = new WebApiProxy("http://localhost:3001");
            _userSettings = {} as ComponentFramework.UserSettings;
            _userSettings.userId = "00000000-0000-0000-0000-000000000000";
            _recordId = "00000000-0000-0000-0000-000000000000";
            _entityName = "";
        } else {
            _api = context.webAPI;
            _userSettings = context.userSettings;
            _userSettings.userId = (<any>_userSettings).userId;
            _recordId = (<any>context).page.entityId.replace("{", "").replace("}", "") ?? "";
            _entityName = (<any>context).page.entityTypeName ?? "";
        }

        const props: IGenericComponentProps = { webAPI: _api, recordId: _recordId, entityName: _entityName, userSettings: _userSettings };
        return React.createElement(GenericComponent, props);
    }
```

## 5. Minimal Pattern
```js
    const props: IGenericComponentProps = {
      webAPI: _api,
      recordId: _recordId,
      entityName: _entityName,
      userSettings: _userSettings
    };

    return React.createElement(GenericComponent, props);
```

## 6. Recommended Development Flow

1.  Install dependencies
2.  Start the proxy
3.  Start the PCF sandbox
4.  Develop React logic locally
5.  Test inside Dataverse

## 7. Notes

-   The proxy is meant for local development only.
-   Replace mock IDs if your component depends on user or entity
    context.
-   Extracting interfaces improves testability.

## 8. Troubleshooting

| Issue  | Suggested Action |
| ------ | ---------------- |
| 404 from proxy | Ensure npm run start:backend is running. |
| webAPI undefined | Check localhost detection. |
| Empty data | Validate queries and proxy configuration. |

## 9. Environment Configuration (.env)

Before running the project, make sure to configure a `.env` file at the root of your workspace.  
This file stores the connection details required to authenticate against your Dynamics CRM environment.

### Required Variables

```env
ENVIRONMENT_URL=<Your Dynamics CRM environment URL>
TENANT_ID=<Your Azure AD Tenant ID>
CLIENT_ID=<Your Azure AD Application (Client) ID with CRM permissions>
CLIENT_SECRET=<Your Azure AD Application Client Secret>
```

## 10. Extension Suggestion

Create service modules (e.g., lib/DataverseQueueService.ts) consuming
webAPI and inject abstractions through props for easier mocking and
better testability.
