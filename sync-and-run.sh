#!/usr/bin/env bash

cd $(dirname $0)

cd pru
echo "Building TypeScript..."
node_modules/typescript/bin/tsc
TSC=$?
cd ..

if [[ $TSC == 0 ]]; then
	echo "Getting BBB IP..."
	echo $(which bbb-ip)
	IP=$(bbb-ip)
	echo $IP
	echo "Syncing...."
	./rsync-to-bbb.sh $IP
	echo "Runing opc-server"
	ssh root@$IP -t -o UserKnownHostsFile=/dev/null -o StrictHostKeyChecking=no "
		rm -r /tmp/pru
		killall opc-server && sleep 1
		cd LEDscape
		./opc-server $@
	"
else
	echo "TSC Compilation Failed. Not Executing"
fi
