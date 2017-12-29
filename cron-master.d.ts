
export interface CronMasterJobOptions {
  cronParams: {
    cronTime: string | Date
    onTick: (job: CronMasterJob, done: (err: any, result: any) => void) => void
    onComplete?: () => void
    start?: boolean
    timeZone?: string
    context?: any
    runOnInit?: boolean
  },
  meta: any
}

export class CronMasterJob {
  constructor(options: CronMasterJobOptions)

  start(callback?: () => void): void

  forceRun(callback?: (err: any, result: any) => void): void

  run(callback?: () => void): void

  stop(callback?: () => void): void
}

export interface Manager {
  hasRunningJobs(): boolean
  getJobs(): CronMasterJob[]
  getRunningJobs(): CronMasterJob[]
  startJobs(callback: () => void): void
  stopJobs(callback: () => void): void
  loadJobs(folder: string, callback: (err: any, jobs: CronMasterJob[]) => void): void
}

export function getInstance (): Manager
