import React from 'react';
import ReactModal from 'react-modal';

import './Modal.css';

interface IProps {
  title: string;
  onLoad: (openModal: () => void) => void;
}
interface IState {
  isOpen: boolean;
}

export class Modal extends React.Component<IProps, IState> {
  constructor(props: IProps) {
    super(props);

    this.state = {
      isOpen: false,
    };
  }

  componentDidMount() {
    const { onLoad } = this.props;
    onLoad(() => this.openModal());
  }

  openModal() {
    const { isOpen } = this.state;
    if (!isOpen) {
      this.setState({ isOpen: true });
    }
  }

  closeModal() {
    const { isOpen } = this.state;
    if (isOpen) {
      this.setState({ isOpen: false });
    }
  }

  render() {
    const { children, title } = this.props;
    const { isOpen } = this.state;

    return (
      <div>
        <ReactModal
          closeTimeoutMS={500}
          isOpen={isOpen}
          overlayClassName="modal-overlay"
          style={{
            content: {
              inset: '80px',
              boxShadow: '0 4px 8px 0 rgba(0, 0, 0, 20%), 0 6px 20px 0 rgba(0, 0, 0, 19%)',
            },
          }}
        >
          <div className="modal-header">
            <h2 className="modal-title">{title}</h2>
            <div>
              <button type="button" className="modal-close" onClick={() => this.closeModal()}>&times;</button>

            </div>
          </div>
          <div className="modal-body">{children}</div>
        </ReactModal>
      </div>
    );
  }
}
