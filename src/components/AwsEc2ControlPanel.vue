<script lang="ts" setup>
import { EC2Client, StartInstancesCommand, StopInstancesCommand, DescribeInstancesCommand } from '@aws-sdk/client-ec2'
import { mdiEyeOff, mdiEye } from '@mdi/js'

const ec2Client = shallowRef<EC2Client>()
const awsConfig = ref<AwsConfig>()
const config = reactive<{ data: AwsConfig }>({
  data: {
    region: '',
    credentials: {
      accessKeyId: '',
      secretAccessKey: '',
    },
    instanceId: '',
  },
})
const accessKeyShow = ref(false)
const secretAccessKeyShow = ref(false)
const loadingStart = ref(false)
const loadingStop = ref(false)
const loadingRefresh = ref(false)
const loadingDescribe = ref(false)

const error = ref<undefined | null | Error>()
const message = ref()
const alert = ref(false)
const instanceId = ref('')
const instanceInfo = ref<{ name: string; value: any }[]>([])
const instanceState = ref()
const instanceDialog = ref(false)
const configDialog = ref(false)
const rules = [
  (value: string) => !!value || '必須',
  (value: string) => {
    const pattern = /^i-[0-9a-zA-Z]+$/
    return pattern.test(value) || '不正なインスタンスID'
  },
]
const configRules = [(value: string) => !!value || '必須']

const state = computed(() => {
  const elm = instanceInfo.value.find((elm) => elm.name === '状態')
  if (elm) {
    return elm.value
  }
  return '不明'
})

const withAsyncState = async (exec: () => Promise<void>) => {
  clearMessage()
  try {
    await exec()
  } catch (err) {
    error.value = err as unknown as Error
    message.value = error.value.message
    throw err
  }
}

const execStartInstance = () => {
  const command = new StartInstancesCommand({ InstanceIds: [instanceId.value] })
  return ec2Client.value!.send(command)
}

const execStopInstance = () => {
  const command = new StopInstancesCommand({ InstanceIds: [instanceId.value] })
  return ec2Client.value!.send(command)
}

const execDescribeInstance = () => {
  const command = new DescribeInstancesCommand({ InstanceIds: [instanceId.value] })
  return ec2Client.value!.send(command).then((response) => {
    if (response.Reservations && response.Reservations[0].Instances) {
      const instance = response.Reservations[0].Instances[0]
      instanceInfo.value = [
        { name: 'イメージ', value: instance.ImageId },
        { name: 'タイプ', value: instance.InstanceType },
        { name: '起動時刻', value: instance.LaunchTime },
        {
          name: 'プライベートアドレス',
          value: instance.PrivateIpAddress,
        },
        { name: 'プライベートDNS', value: instance.PrivateDnsName },
        { name: 'パブリックアドレス', value: instance.PublicDnsName },
        { name: 'パブリックDNS', value: instance.PublicIpAddress },
        { name: 'サブネットID', value: instance.SubnetId },
        { name: '状態', value: instance.State?.Name },
        { name: 'VpcID', value: instance.VpcId },
        { name: 'タグ', value: JSON.stringify(instance.Tags) },
      ]
      instanceState.value = instance.State?.Name
      return response
    }
  })
}

watch(configDialog, () => {
  clearMessage()
})

onMounted(async () => {
  await reloadConfig()
  if (instanceId.value) {
    execDescribeInstance()
  }
})

function clearMessage() {
  alert.value = false
  message.value = ''
  error.value = null
}

async function readAwsConfig() {
  return await window.api.readconfig()
}

async function startInstance() {
  await withAsyncState(async () => {
    loadingStart.value = true
    await execStartInstance().then((response) => {
      if (response.StartingInstances) {
        const { CurrentState, PreviousState } = response.StartingInstances[0]
        message.value = `現在の状態: ${CurrentState!.Name}, 以前の状態: ${PreviousState!.Name}`
        instanceState.value = CurrentState!.Name
      }
    })
    alert.value = true
    loadingStart.value = false
  })
}

async function stopInstance() {
  await withAsyncState(async () => {
    loadingStop.value = true
    await execStopInstance().then((response) => {
      if (response.StoppingInstances) {
        const { CurrentState, PreviousState } = response.StoppingInstances[0]
        message.value = `現在の状態: ${CurrentState!.Name}, 以前の状態: ${PreviousState!.Name}`
        instanceState.value = CurrentState!.Name
      }
    })
    alert.value = true
    loadingStop.value = false
  })
}

async function refresh() {
  await withAsyncState(async () => {
    loadingRefresh.value = true
    await execDescribeInstance()
    loadingRefresh.value = false
  })
}

async function describeInstances() {
  await withAsyncState(async () => {
    loadingDescribe.value = true
    await execDescribeInstance()
      .then(() => {
        instanceDialog.value = true
        instanceState.value = state.value
      })
      .catch((err) => (alert.value = true))
    loadingDescribe.value = false
  })
}

async function reloadConfig() {
  await readAwsConfig().then((data) => {
    if (data) {
      awsConfig.value = data
      config.data = awsConfig.value
      ec2Client.value = new EC2Client({
        region: awsConfig.value.region,
        credentials: awsConfig.value.credentials,
      })
      instanceId.value = config.data.instanceId || ''
    }
  })
}

async function saveConfig() {
  await withAsyncState(async () => {
    await window.api.writeconfig({
      region: config.data.region,
      credentials: {
        accessKeyId: config.data.credentials.accessKeyId,
        secretAccessKey: config.data.credentials.secretAccessKey,
      },
      instanceId: config.data.instanceId,
    })
  })
    .then(async () => {
      message.value = `書き込みに成功しました`
    })
    .catch(() => {
      message.value = '書き込みに失敗しました'
    })

  await reloadConfig()
}
</script>

<template>
  <v-container>
    <v-card class="mx-auto pa-5" max-width="700">
      <h1 class="mx-auto text-h6 text-center font-weight-bold py-5">AWS EC2 コントロールパネル</h1>
      <v-alert v-model="alert" :type="error ? 'error' : 'success'" closable>
        {{ message }}
      </v-alert>
      <div class="my-2">
        インスタンスの状態：<v-chip v-if="instanceState"> {{ instanceState }} </v-chip>
      </div>
      <v-form class="my-5">
        <v-text-field v-model="instanceId" label="インスタンスID（例：i-xxxx）" filled :rules="rules"></v-text-field>
        <div class="text-center">
          <v-btn
            color="primary"
            class="ma-3"
            variant="tonal"
            large
            :loading="loadingStart"
            @click="startInstance"
            :disabled="!instanceId"
          >
            起動
          </v-btn>
          <v-btn
            color="error"
            class="ma-3"
            variant="tonal"
            large
            :loading="loadingStop"
            @click="stopInstance"
            :disabled="!instanceId"
          >
            停止
          </v-btn>
          <v-btn class="ma-3" large variant="tonal" @click="refresh" :loading="loadingRefresh" :disabled="!instanceId">
            更新
          </v-btn>

          <v-btn
            class="ma-3"
            large
            variant="tonal"
            @click="describeInstances"
            :loading="loadingDescribe"
            :disabled="!instanceId"
          >
            インスタンス情報
          </v-btn>
          <v-btn color="success" class="ma-3" large variant="tonal" @click="configDialog = true"> 設定編集 </v-btn>
        </div>
      </v-form>
      <v-dialog v-if="instanceDialog" v-model="instanceDialog" min-width="500" max-width="1024">
        <v-card>
          <v-card-title class="text-h6"> インスタンス：{{ instanceId }} </v-card-title>

          <v-table dense>
            <template v-slot:default>
              <thead>
                <tr>
                  <th class="wtext-left">項目</th>
                  <th class="text-left">内容</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in instanceInfo" :key="item.name" class="text-body-2">
                  <td>{{ item.name }}</td>
                  <td>{{ item.value }}</td>
                </tr>
              </tbody>
            </template>
          </v-table>

          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn color="primary" text @click="instanceDialog = false"> 閉じる </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <v-dialog v-if="configDialog" v-model="configDialog" class="pa-4" min-width="500" z-index="5">
        <v-card class="pa-5">
          <v-card-title>AWS設定</v-card-title>
          <v-text-field v-model="config.data.region" label="リージョン" filled :rules="configRules"></v-text-field>
          <v-text-field
            v-model="config.data.credentials.accessKeyId"
            label="アクセスキー"
            :type="accessKeyShow ? 'text' : 'password'"
            :append-icon="accessKeyShow ? mdiEye : mdiEyeOff"
            filled
            :rules="configRules"
            @click:append="accessKeyShow = !accessKeyShow"
          ></v-text-field>
          <v-text-field
            v-model="config.data.credentials.secretAccessKey"
            label="シークレットキー"
            :type="secretAccessKeyShow ? 'text' : 'password'"
            :append-icon="secretAccessKeyShow ? mdiEye : mdiEyeOff"
            filled
            :rules="configRules"
            @click:append="secretAccessKeyShow = !secretAccessKeyShow"
          >
          </v-text-field>
          <v-text-field v-model="config.data.instanceId" label="デフォルトインスタンス" filled></v-text-field>

          <v-card-actions>
            <span v-if="message" class="text-subtitle-2">{{ message }}</span>
            <v-spacer></v-spacer>
            <v-btn color="primary" text @click=";(configDialog = false), (message = '')"> 閉じる </v-btn>
            <v-btn color="primary" variant="tonal" @click="saveConfig"> 保存する </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </v-card>
  </v-container>
</template>
