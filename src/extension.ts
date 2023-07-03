
import { ChildProcess } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { load } from 'js-yaml';
import * as vscode from 'vscode';
import { KubeKportTreeDataProvider } from './kportTreeDataProvider';
import { downloadBinary } from './server/ideServer';
import * as http from 'http';
import { sep } from 'path';

let proc: ChildProcess;

export function activate(context: vscode.ExtensionContext) {
	let outChannel = vscode.window.createOutputChannel('Kport');
	let config:any = {};

	if(vscode.workspace.workspaceFolders){
		if (vscode.workspace.workspaceFolders[0]) {
			outChannel.appendLine("Checking for .kport.yaml file in " + vscode.workspace.workspaceFolders[0].uri.path);
			const configFile = vscode.workspace.workspaceFolders[0].uri.path + sep + ".kport.yaml";
			if (existsSync(configFile )) {
				config = load(readFileSync(configFile, 'utf8'));
			}
		}
	}

	const kportDataProvider = new KubeKportTreeDataProvider(config);
	context.subscriptions.push(vscode.window.registerTreeDataProvider('kport', kportDataProvider));
	context.subscriptions.push(vscode.commands.registerCommand('kport.refreshEntry', () => kportDataProvider.refresh()));

	let watcher = vscode.workspace.createFileSystemWatcher("**/.kport.yaml");
	context.subscriptions.push(watcher);
	watcher.onDidChange(uri => kportDataProvider.refresh());
	watcher.onDidCreate(uri => kportDataProvider.refresh());
	watcher.onDidDelete(uri => kportDataProvider.refresh());

	// download the kport binary and get the binary path
	downloadBinary().then((binaryPath) => {
		// start the kport server
		if (!proc || proc.killed) {
			const cp = require('child_process')
			proc = cp.spawn(binaryPath, {
				cwd: vscode.workspace.workspaceFolders![0].uri.path // the current workspace folder
			}, (err: Error, stdout: string, stderr: string) => {
				outChannel.appendLine(stdout);
				outChannel.appendLine(stderr);
			});
		}
		else {
			proc.kill();
		}
	});



	// start the kport server
	// if (!proc || proc.killed) {
	// 	const cp = require('child_process')
	// 	proc = cp.spawn('/home/sunix/github/sunix/kubectl-teleport/target/kubectl-kport-1.0.0-SNAPSHOT-runner', {
	// 		cwd: '/home/sunix/github/redhat-developer-demos/northwind-traders/northwind/'
	// 	}, (err: Error, stdout: string, stderr: string) => {
	// 		outChannel.appendLine(stdout);
	// 		outChannel.appendLine(stderr);
	// 	});
	// }
	// else {
	// 	proc.kill();
	// }

	context.subscriptions.push(vscode.commands.registerCommand('kport.stop', () => {

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

		req.write(JSON.stringify(kportDataProvider.config));

		req.end();
		kportDataProvider.started = false;

	}));

	context.subscriptions.push(vscode.commands.registerCommand('kport.hello', () => {
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
	context.subscriptions.push(vscode.commands.registerCommand('kport.start', () => {
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
				kportDataProvider.started = true;
			});
		});
		req.on('error', function (e) {
			outChannel.appendLine('problem with request: ' + e.message);
			kportDataProvider.started = false;
		});

		req.write(JSON.stringify(kportDataProvider.config));

		req.end();
	}));

	context.subscriptions.push(vscode.commands.registerCommand('kport.addNewRemoteService', () => {
		// kportDataProvider.config;
	}));
	
}

// This method is called when your extension is deactivated
export function deactivate() {
	if (proc) {
		proc.kill();
	}
}
