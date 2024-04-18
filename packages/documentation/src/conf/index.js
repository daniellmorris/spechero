import apiSpec from '../../../services/api/openapi.yaml';
import asyncSpec from '../../../services/worker/asyncapi.yaml';

export default {
  specOptions: [apiSpec, asyncSpec].map((spec) => ({
    label: spec.info.title,
    value: spec.info.title,
    spec,
    type: spec.openapi ? 'openapi' : 'asyncapi',
  })),
  // [
  //   { label: "API", value: "./openapi.yaml", spec: apiSpec, type: 'openapi' },
  //   { label: "Worker", value: "./asyncapi.yaml", spec: asyncSpec ,type: 'asyncapi' },
  // ]
}
