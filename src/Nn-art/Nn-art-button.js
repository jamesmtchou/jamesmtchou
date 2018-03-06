import React, { Component } from 'react'
import FloatingActionButton from 'material-ui/FloatingActionButton';
import ContentAdd from 'material-ui/svg-icons/content/add';
import ContentRemove from 'material-ui/svg-icons/content/remove';
import CameraIcon from 'material-ui/svg-icons/action/camera-enhance';
import { greenA400, white } from 'material-ui/styles/colors';

class NnArtButton extends Component {
    state = {linkEnabled: false};
    toggleState = (bool) => {
        this.setState({ linkEnabled: bool });
    };
    render() {
        const { nnArtEnabled, videoEnabled, onClick, onClickSecondary } = this.props;
        const backgroundColor = 'rgb(0, 175, 210)';
        const secondary = nnArtEnabled ? 'secondary' : '';
        const cppnHref = 'http://blog.otoro.net/2016/03/25/generating-abstract-patterns-with-tensorflow/';
        return (
            <div className={`nn-buttons-container ${secondary}`} onMouseEnter={() => this.toggleState(true)} onMouseLeave={() => this.toggleState(false)}>
                <FloatingActionButton backgroundColor={backgroundColor} className={`action-button cppn-link-button ${this.state.linkEnabled ? 'buttonEnabled' : ''}`}
                                      secondary={nnArtEnabled} href={cppnHref} target="_blank"><span>CPPN</span></FloatingActionButton>
                <FloatingActionButton backgroundColor={backgroundColor} className={`action-button video-button ${nnArtEnabled ? 'buttonEnabled' : ''}`}
                                      secondary={nnArtEnabled} onClick={onClickSecondary} iconStyle={{fill: videoEnabled ? greenA400 : white}}>
                    <CameraIcon />
                </FloatingActionButton>
                <FloatingActionButton backgroundColor={backgroundColor} className="nn-button"  onClick={onClick}
                    secondary={nnArtEnabled}>
                        {nnArtEnabled ? <ContentRemove /> : <ContentAdd />}
                </FloatingActionButton>
            </div>
        );
    }
}

export default NnArtButton;