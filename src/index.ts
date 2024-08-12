import { EventBridgeEvent } from "aws-lambda";
import { EC2Client, DescribeSecurityGroupsCommand } from '@aws-sdk/client-ec2';
import { Netmask } from 'netmask';

export async function lambdaHandler(event: EventBridgeEvent<"", EventDetails>) {
    const describeSecurityGroupsCommand = new DescribeSecurityGroupsCommand({
        GroupIds: [event.detail.requestParameters.groupId]
    });
    const ec2Client = new EC2Client();
    const describeSGResults = await ec2Client.send(describeSecurityGroupsCommand);
    const ipAddrs = new Set<string>();

    if (describeSGResults && describeSGResults.SecurityGroups) {
        for (const sg of describeSGResults.SecurityGroups) {
            if (sg.IpPermissions) {
                for (const permission of sg.IpPermissions) {
                    if (permission.IpRanges) {
                        for (const range of permission.IpRanges) {
                            try {
                                new Netmask(range.CidrIp);
                                ipAddrs.add(range.CidrIp);
                            } catch {
                                continue;
                            }
                        }
                    }
                }
            }
        }
    }

    if (Array.from(ipAddrs).some(ip => ip === '0.0.0.0/0')) {
        throw `0.0.0.0/0 found in ${event.detail.requestParameters.groupId}`;
    }
}
