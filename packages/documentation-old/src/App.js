import SwaggerUI from "swagger-ui-react"
import AsyncApiComponent, { ConfigInterface } from "@asyncapi/react-component";
import "swagger-ui-react/swagger-ui.css"
import logo from './logo.svg';
import './App.css';
import conf from "./conf";
import { useState } from "react";

const config: ConfigInterface = {
  "show": {
    "sidebar": true,
    "info": true,
    "operations": true,
    "servers": true,
    "messages": true,
    "schemas": true,
    "errors": true
  },
  "expand":{
    "messageExamples": false
  },
  "sidebar": {
    "showServers": "byDefault",
    "showOperations": "byDefault"
  }
}

const schema = `
asyncapi: '2.0.0'
info:
  title: Example
  version: '0.1.0'
channels:
  example-channel:
    subscribe:
      message:
        payload:
          type: object
          properties:
            exampleField:
              type: string
            exampleNumber:
              type: number
            exampleDate:
              type: string
              format: date-time
`;

function App() {
  // useState to store the selected value (Default to first item)
  const [selectedValue, setSelectedValue] = useState(conf?.specOptions[0].value);
  const onChange = (e) => {
    // Set the selected value to the value of the selected option
    // 
    setSelectedValue(e.target.value);      
  }
  // Get config item based on selected value
  const option = conf.specOptions.find(item => item.value === selectedValue);
  return (
    <div>
      <div id="custom-topbar" style={{marginBottom: '20px', textAlign: 'right'}}>
        <select id="custom-select-dropdown" value={selectedValue} onChange={onChange}>
          { 
            conf?.specOptions && conf.specOptions.map((item, index) => {
              return <option key={index} value={item.value}>{item.label}</option>
            })
          }
        </select>
      </div>
      { option.type === 'openapi' 
        ? <SwaggerUI url={selectedValue} /> 
        : 
        <asyncapi-component
          schemaUrl={selectedValue}
          config={config}
          schemaFetchOptions='{"method":"GET","mode":"cors"}'
          cssImportPath="https://unpkg.com/@asyncapi/react-component@0.24.0/styles/default.min.css" />
      }
    </div>
  );
}

export default App;
