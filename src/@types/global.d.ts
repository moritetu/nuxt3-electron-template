interface Window {
  api: Api
}

interface Api {
  readconfig: () => AwsConfig
  writeconfig: (config: AwsConfig) => void
}

interface AwsConfig {
  region: string
  credentials: {
    accessKeyId: string
    secretAccessKey: string
  }
  instanceId?: string
}
