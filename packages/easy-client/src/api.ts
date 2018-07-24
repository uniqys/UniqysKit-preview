import { AxiosInstance, AxiosPromise } from 'axios'

export class Api {
  constructor (
    private readonly client: AxiosInstance
  ) {}

  public async account (address: string): Promise<{ nonce: number, balance: number }> {
    return (await this.client.get(`/uniqys/accounts/${address}`)).data
  }
  public async nonce (address: string): Promise<number> {
    return (await this.client.get(`/uniqys/accounts/${address}/nonce`)).data[0]
  }
  public async balance (address: string): Promise<number> {
    return (await this.client.get(`/uniqys/accounts/${address}/balance`)).data[0]
  }
  public awaiting<T = any> (id: string): AxiosPromise<T> {
    return this.client.get(`/uniqys/awaiting/${id}`)
  }
}
