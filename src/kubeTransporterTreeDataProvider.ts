import * as vscode from 'vscode';
import { existsSync, readFileSync } from 'fs';
import { load } from 'js-yaml';
import { sep } from 'path';



export class KubeTransporterTreeDataProvider implements vscode.TreeDataProvider<string|RemoteService|LocalService> {
    public get config(): any | undefined {
        return this._config;
    }
    private set config(value: any | undefined) {
        this._config = value;
    }
    private _started: boolean = false;
    public get started(): boolean {
        return this._started;
    }
    public set started(value: boolean) {
        this._started = value;
        this.refresh();
    }

	private _onDidChangeTreeData: vscode.EventEmitter<string|RemoteService|LocalService | undefined | void> = new vscode.EventEmitter<string|RemoteService|LocalService | undefined | void>();
	readonly onDidChangeTreeData: vscode.Event<string|RemoteService|LocalService | undefined | void> = this._onDidChangeTreeData.event;

	constructor(private _config: any | undefined) {
	}

	refresh(): void {
        this.config = {};
        let outChannel = vscode.window.createOutputChannel('Transporter');
        if(vscode.workspace.workspaceFolders){
            if (vscode.workspace.workspaceFolders[0]) {
                outChannel.appendLine("Checking for .transporter.yaml file in " + vscode.workspace.workspaceFolders[0].uri.path);
                const configFile = vscode.workspace.workspaceFolders[0].uri.path + sep + ".transporter.yaml";
                if (existsSync(configFile )) {
                    this.config = load(readFileSync(configFile, 'utf8'));
                }
            }
        }

		this._onDidChangeTreeData.fire();
	}

	getTreeItem(element: string|RemoteService|LocalService): vscode.TreeItem {
        if(element === 'remoteServices') {
            return new vscode.TreeItem("📡 Remote Service", vscode.TreeItemCollapsibleState.Expanded);
        }
    
        if(element === 'localServices') {
            return new vscode.TreeItem("📥 Local Service", vscode.TreeItemCollapsibleState.Expanded);
        }
    
        if(element === 'socksPort') {
            return new vscode.TreeItem(`🧦 Socks port:  ${this.config.socksPort}`, vscode.TreeItemCollapsibleState.None);
        }
    
        if(element instanceof RemoteService){
			return new vscode.TreeItem(`${this.started?'🟢':'⚫'} ${element.localPort}\t→  ☁️ ${element.hostname}:${element.port}`,vscode.TreeItemCollapsibleState.None);
		}
		if(element instanceof LocalService){
			return new vscode.TreeItem(`☁️ ${element.serviceName}\t→  ${this.started?'🟢':'⚫'} ${element.port}`,vscode.TreeItemCollapsibleState.None);
		}

        return new vscode.TreeItem(element, vscode.TreeItemCollapsibleState.None);
    
	}

	getChildren(element?: string|RemoteService|LocalService): Thenable<string[] | RemoteService[] | LocalService[]> {
        
		if (element === 'remoteServices') {
			const vals:any[] = Object.values(this.config.remoteServices);
			return Promise.resolve(Array.from(vals).map(s => new RemoteService(s)));
		}
		if (element === 'localServices') {
			const vals:any[] = Object.values(this.config.localServices);
			return Promise.resolve(Array.from(vals).map(s => new LocalService(s)));
		}
        
        return Promise.resolve(Object.keys(this.config));
    
    
	}
}


class RemoteService {
	public hostname?: string;
	public port?:number;
	public localPort?:number;

	constructor(rs: {hostname: string, port: number, localPort:number}) {
		Object.assign(this, rs);
	}
}

class LocalService {


	public serviceName?: string;
	public port?:number;
	public type?:string;

	constructor(ls: {serviceName: string, port: number, type:string}) {
		Object.assign(this, ls);
	}
		
}