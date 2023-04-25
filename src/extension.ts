
import { ChildProcess } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { load } from 'js-yaml';
import * as vscode from 'vscode';
import { KubeTransporterTreeDataProvider } from './kubeTransporterTreeDataProvider';
import * as http from 'http';
import { sep } from 'path';

let proc: ChildProcess;

export function activate(context: vscode.ExtensionContext) {
	let outChannel = vscode.window.createOutputChannel('Transporter');
	let config:any = {};
	if(vscode.workspace.workspaceFolders){
		if (vscode.workspace.workspaceFolders[0]) {
			outChannel.appendLine("Checking for .transporter.yaml file in " + vscode.workspace.workspaceFolders[0].uri.path);
			const configFile = vscode.workspace.workspaceFolders[0].uri.path + sep + ".transporter.yaml";
			if (existsSync(configFile )) {
				config = load(readFileSync(configFile, 'utf8'));
			}
		}
	}

	const kubeTransporterDataProvider = new KubeTransporterTreeDataProvider(config);
	context.subscriptions.push(vscode.window.registerTreeDataProvider('kubeTransporter', kubeTransporterDataProvider));
	context.subscriptions.push(vscode.commands.registerCommand('kubeTransporter.refreshEntry', () => kubeTransporterDataProvider.refresh()));


	// start the transporter server
	// if (!proc || proc.killed) {
	// 	const cp = require('child_process')
	// 	proc = cp.spawn('/home/sunix/github/sunix/kubectl-teleport/target/kubectl-transporter-1.0.0-SNAPSHOT-runner', {
	// 		cwd: '/home/sunix/github/redhat-developer-demos/northwind-traders/northwind/'
	// 	}, (err: Error, stdout: string, stderr: string) => {
	// 		outChannel.appendLine(stdout);
	// 		outChannel.appendLine(stderr);
	// 	});
	// }
	// else {
	// 	proc.kill();
	// }

	context.subscriptions.push(vscode.commands.registerCommand('kubeTransporter.stop', () => {

		let options = {
			hostname: 'localhost',
			port: 10680,
			path: '/stop',
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			}
		};
		let req = http.request(options, function (res) {
			outChannel.appendLine('Status: ' + res.statusCode);
			outChannel.appendLine('Headers: ' + JSON.stringify(res.headers));
			res.setEncoding('utf8');
			res.on('data', function (body) {
				outChannel.appendLine('Body: ' + body);
			});
		});
		req.on('error', function (e) {
			outChannel.appendLine('problem with request: ' + e.message);
		});

		req.write(JSON.stringify(kubeTransporterDataProvider.config));

		req.end();
		kubeTransporterDataProvider.started = false;

	}));

	context.subscriptions.push(vscode.commands.registerCommand('kubeTransporter.hello', () => {
		http.get({
			hostname: 'localhost',
			port: 10680,
			path: `/hello`,
			headers: {
				'Content-Type': 'application/json'
			}
		}, (res) => {
			res.setEncoding('utf8');
			let body = '';
			res.on('data', (data) => {
				body += data;
			});
			res.on('end', () => {
				//const data = JSON.parse(body);
				outChannel.appendLine(body);

			});
		}).on('error', (error) => {
			outChannel.appendLine(error.message);
		});
	}));
	context.subscriptions.push(vscode.commands.registerCommand('kubeTransporter.start', () => {
		let options = {
			hostname: 'localhost',
			port: 10680,
			path: '/start',
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			}
		};
		let req = http.request(options, function (res) {
			outChannel.appendLine('Status: ' + res.statusCode);
			outChannel.appendLine('Headers: ' + JSON.stringify(res.headers));
			res.setEncoding('utf8');
			res.on('data', function (body) {
				outChannel.appendLine('Body: ' + body);
				kubeTransporterDataProvider.started = true;
			});
		});
		req.on('error', function (e) {
			outChannel.appendLine('problem with request: ' + e.message);
			kubeTransporterDataProvider.started = false;
		});

		req.write(JSON.stringify(kubeTransporterDataProvider.config));

		req.end();
	}));

	context.subscriptions.push(vscode.commands.registerCommand('kubeTransporter.addNewRemoteService', () => {
		// kubeTransporterDataProvider.config;
	}));
	
}

// This method is called when your extension is deactivated
export function deactivate() {
	if (proc) {
		proc.kill();
	}
}
