<template>
  <div>
    <div class="navbar navbar-light bg-light">
      <div class="container">
        <div class="navbar-brand">Messages</div>
        <div class="navbar-text">
          A sample of Easy Framework by Uniqys Kit
        </div>
      </div>
    </div>
    <div class="container" style="margin-top: 40px; margin-bottom: 60px;">
      <section class="jumbotron">
        <h1>Messages</h1>
        <p>Messages is a simple application that can post and read messages.</p>
        <p>You get a token every time you post a message. Tokens you received are transferrable to other accounts.</p>
      </section>

      <section>
        <h2>Your account</h2>
        <p>These are your address and token's balance.</p>

        <dl class="row">
          <dt class="col-sm-2">Address</dt>
          <dd class="col-sm-10">{{address}}</dd>
          <dt class="col-sm-2">Balance</dt>
          <dd class="col-sm-10">{{account.balance}}</dd>
        </dl>
      </section>

      <section>
        <h2>Post a message</h2>
        <p>Let's try post a message to timeline.</p>

        <form>
          <div class="form-group row">
            <label for="message" class="col-sm-2">message</label>
            <div class="col-sm-10">
              <textarea
                class="form-control"
                name="message"
                ref="message"
                required
                placeholder="Hello uniqys!"
              ></textarea>
            </div>
          </div>
          <div class="form-group row">
            <div class="col-sm-10 offset-sm-2">
              <button
                class="btn btn-primary"
                type="button"
                @click.prevent="onClickPostMessage"
              >post message</button>
            </div>
          </div>
        </form>
        <div v-if="resolves.postMessage" class="alert alert-success" role="alert">
          Post successful! (id: {{resolves.postMessage.id}}, content: {{resolves.postMessage.content}})
        </div>
        <div v-else-if="rejects.postMessage" class="alert alert-danger" role="alert">
          Post failed! {{rejects.postMessage}}
        </div>
      </section>

      <section>
        <h2>Messages Timeline</h2>
        <p>In this Timeline, display all messages recorded in blockchain.</p>
        <p>You can send token to other addresses.</p>

        <div v-if="resolves.sendToken" class="alert alert-success" role="alert">
          Token send successful!
        </div>
        <div v-else-if="rejects.sendToken" class="alert alert-danger" role="alert">
          Token send failed! {{rejects.sendToken}}
        </div>
        <div v-if="messages && messages.length">
          <div class="list-group">
            <div v-for="message in messages" :key="message.id"
              class="list-group-item flex-column align-items-start"
            >
              <p class="mb-1">{{message.contents}}</p>
              <p class="mb-1"><small>{{message.sender}}</small></p>
              <button
                class="btn btn-light"
                :disabled="message.sender == address"
                @click.prevent="onClickSendToken(message.sender)"
                >send token</button>
            </div>
          </div>
        </div>
        <div v-else>
          <p>Let's post your message.</p>
        </div>
      </section>
    </div>

    <div class="footer">
      <p class="text-center"><small>&copy;&nbsp;Uniqys Project</small></p>
    </div>
  </div>

</template>

<script>
const easy = new Easy('http://localhost:8080')

export default {
  data () {
    return {
      address: easy.address.toString(),
      account: {
        balance: 0,
        nonce: 0,
      },
      messages: null,
      resolves: {
        postMessage: null,
        sendToken: null,
      },
      rejects: {
        postMessage: null,
        sendToken: null,
      },
      modal: {
        message: null,
        show: false
      }
    }
  },
  computed: {
  },
  methods: {
    updateAccount () {
      return easy.api.account(this.address)
        .then((account) => {
          this.account.balance = account.balance || 0
          this.account.nonce   = account.nonce
        })
    },
    updateMessages() {
      return easy.get('/messages')
        .then(({ data }) => this.messages = data)
        .then(() => this.messages.sort((a, b) => a.id < b.id))
    },
    onClickPostMessage () {
      this.resolves.postMessage = null
      this.rejects.postMessage = null

      const message = this.$refs.message.value
      if (!message) {
        this.rejects.postMessage = 'message must be required!'
        return
      }

      easy.post('/messages', { contents: message }, { sign: true })
        .then(({ data }) => {
          this.resolves.postMessage = {
            id: data.id,
            content: data.contents,
          }
          return this.updateMessages()
        })
        .then(() => {
          return this.updateAccount()
        })
        .catch((err) => this.rejects.postMessage = err.toString())
    },
    onClickSendToken (address) {
      this.resolves.sendToken = null
      this.rejects.sendToken = null
      easy.post('/send', { to: address, value: 1 }, { sign: true })
        .then(({ data }) => this.resolves.sendToken = true)
        .then(() => {
          return this.updateAccount()
        })
        .catch((err) => this.rejects.sendToken = err.toString())
    },
    onClickShowMessage({ id }) {
      this.modal.message = null
      easy.get(`/messages/${ id }`)
        .then((res) => {
          this.modal.message = res.data.message
        })
    },
  },
  created () {
    this.updateAccount()
    this.updateMessages()
  }
}
</script>

