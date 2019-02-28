// Libraries
import React, {PureComponent} from 'react'
import {withRouter, WithRouterProps} from 'react-router'

// Components
// import {Button, SlideToggle, ComponentSpacer} from '@influxdata/clockface'
import {ResourceList, Label, Context} from 'src/clockface'
import FeatureFlag from 'src/shared/components/FeatureFlag'

// Types
import {ComponentColor} from '@influxdata/clockface'
import {Task as TaskAPI, Organization} from '@influxdata/influx'

// Utils
import {downloadTextFile} from 'src/shared/utils/download'

// Constants
import {DEFAULT_TASK_NAME} from 'src/dashboards/constants'
import {IconFont} from 'src/clockface/types/index'

interface Task extends TaskAPI {
  organization: Organization
}

interface Props {
  task: Task
  onActivate: (task: Task) => void
  onDelete: (task: Task) => void
  onSelect: (task: Task) => void
  onClone: (task: Task) => void
  onEditLabels: (task: Task) => void
  onRunTask: (taskID: string) => void
  onUpdate?: (task: Task) => void
  onFilterChange: (searchTerm: string) => void
}

export class TaskCard extends PureComponent<Props & WithRouterProps> {
  public render() {
    const {task} = this.props

    return (
      <ResourceList.Card
        testID="task-row"
        disabled={!this.isTaskActive}
        labels={() => this.labels}
        owner={task.organization}
        contextMenu={() => this.contextMenu}
        name={() => (
          <ResourceList.Name
            onUpdate={this.handleUpdateTask}
            name={task.name}
            hrefValue={`/tasks/${task.id}`}
            noNameString={DEFAULT_TASK_NAME}
            parentTestID="dashboard-card--name"
            buttonTestID="dashboard-card--name-button"
            inputTestID="dashboard-card--input"
          />
        )}
        metaData={() => [
          <>Last completed at {task.latestCompleted}</>,
          <>{`Scheduled to run ${this.schedule}`}</>,
        ]}
      />
      //     <SlideToggle
      //       active={this.isTaskActive}
      //       size={ComponentSize.ExtraSmall}
      //       onChange={this.changeToggle}
      //     />
    )
  }

  private get contextMenu(): JSX.Element {
    const {task, onClone, onDelete, onRunTask} = this.props

    return (
      <Context>
        <Context.Menu icon={IconFont.CogThick}>
          <FeatureFlag>
            <Context.Item label="Export" action={this.handleExport} />
          </FeatureFlag>
          <Context.Item label="View Task Runs" action={this.handleViewRuns} />
          <Context.Item label="Run Task" action={onRunTask} value={task.id} />
        </Context.Menu>
        <Context.Menu
          icon={IconFont.Duplicate}
          color={ComponentColor.Secondary}
        >
          <Context.Item label="Clone" action={onClone} value={task} />
        </Context.Menu>
        <Context.Menu
          icon={IconFont.Trash}
          color={ComponentColor.Danger}
          testID="context-delete-menu"
        >
          <Context.Item
            label="Delete"
            action={onDelete}
            value={task}
            testID="context-delete-task"
          />
        </Context.Menu>
      </Context>
    )
  }

  private handleViewRuns = () => {
    const {router, task} = this.props
    router.push(`tasks/${task.id}/runs`)
  }

  private handleUpdateTask = (name: string) => {
    const {onUpdate, task} = this.props
    onUpdate({...task, name})
  }

  private handleClick = e => {
    e.preventDefault()

    this.props.onSelect(this.props.task)
  }

  private handleExport = () => {
    const {task} = this.props
    downloadTextFile(task.flux, `${task.name}.flux`)
  }

  private get labels(): JSX.Element {
    const {task} = this.props

    if (!task.labels.length) {
      return <Label.Container onEdit={this.handleEditLabels} />
    }

    return (
      <Label.Container resourceName="this Task" onEdit={this.handleEditLabels}>
        {task.labels.map(label => (
          <Label
            key={label.id}
            id={label.id}
            colorHex={label.properties.color}
            name={label.name}
            description={label.properties.description}
            onClick={this.handleLabelClick}
          />
        ))}
      </Label.Container>
    )
  }

  private handleLabelClick = (id: string) => {
    const label = this.props.task.labels.find(l => l.id === id)

    this.props.onFilterChange(label.name)
  }

  private get isTaskActive(): boolean {
    const {task} = this.props
    if (task.status === TaskAPI.StatusEnum.Active) {
      return true
    }
    return false
  }

  private handleEditLabels = () => {
    const {task, onEditLabels} = this.props

    onEditLabels(task)
  }

  private changeToggle = () => {
    const {task, onActivate} = this.props
    if (task.status === TaskAPI.StatusEnum.Active) {
      task.status = TaskAPI.StatusEnum.Inactive
    } else {
      task.status = TaskAPI.StatusEnum.Active
    }
    onActivate(task)
  }

  private get schedule(): string {
    const {task} = this.props
    if (task.every && task.offset) {
      return `every ${task.every}, offset ${task.offset}`
    }
    if (task.every) {
      return `every ${task.every}`
    }
    if (task.cron) {
      return task.cron
    }
    return ''
  }
}
export default withRouter(TaskCard)
