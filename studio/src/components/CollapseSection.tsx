import React from 'react';

import { Collapse } from 'react-collapse';

import './CollapseSection.css';

interface IProps {
  title: string;
  isOpened?: boolean;
}
interface IState {
  isOpened: boolean;
}

export class CollapseSection extends React.Component<IProps, IState> {
  constructor(props: IProps) {
    super(props);

    this.state = {
      isOpened: props.isOpened || false,
    };
  }

  render(): React.ReactNode {
    const {
      children,
      title,
    } = this.props;
    const {
      isOpened,
    } = this.state;

    const activeClass = (isOpened) ? ' active' : '';

    return (
      <div>
        <button className={`collapsible${activeClass}`} type="button" onClick={() => this.setState({ isOpened: !isOpened })}>{title}</button>
        <Collapse isOpened={isOpened} className="content">
          <div className="collapse-content">{children}</div>
        </Collapse>
      </div>
    );
  }
}
