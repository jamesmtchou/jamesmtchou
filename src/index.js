import React, {Component} from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import NnArt from './Nn-art/Nn-art'
import NnArtButton from './Nn-art/Nn-art-button';
import './index.css';
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';

class Shell extends Component {
    constructor(props) {
        super(props);
        this.state = {
            nnArtEnabled: false,
            videoEnabled: false,
        };
        this.toggleNnArt = this.toggleNnArt.bind(this);
        this.toggleVideo = this.toggleVideo.bind(this);
    }
    toggleNnArt() {
        this.setState({nnArtEnabled: !this.state.nnArtEnabled});
    }
    toggleVideo() {
        this.setState({videoEnabled: !this.state.videoEnabled});
    }
    render() {
        const { nnArtEnabled } = this.state;
        return (
            <MuiThemeProvider>
                <div id="index">
                    <NnArt {...this.state}/>
                    <App/>
                    <NnArtButton nnArtEnabled={nnArtEnabled} onClick={this.toggleNnArt} onClickSecondary={this.toggleVideo}/>
                </div>
            </MuiThemeProvider>
        );
    }
}

ReactDOM.render(
    <Shell />,
    document.getElementById('root')
);
