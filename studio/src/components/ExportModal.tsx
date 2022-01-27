import React from 'react';

import { Modal } from './Modal';

interface Settings {
  /** If true, then user wants to export decoded, else export raw. */
  decoded: boolean;
}

interface IProps {
  onLoad: (openModal: () => void) => void;
  onExport: (settings: Settings) => void;
}
interface IState {

}

export class ExportModal extends React.Component<IProps, IState> {
  private openModal?: () => void;

  constructor(props: IProps) {
    super(props);

    this.state = {

    };
  }

  componentDidMount() {
    const { onLoad } = this.props;
    onLoad(() => this.open());
  }

  open() {
    this.openModal?.();
  }

  render() {
    return (
      <Modal
        title="Export Logged Data"
        onLoad={(openModal) => {
          this.openModal = openModal;
        }}
      >
        <div>t</div>

      </Modal>
    );
  }
}
