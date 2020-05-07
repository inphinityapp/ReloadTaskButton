# ReloadTaskButton
Reload task button is Qlik Sense extension for starting qmc reload task directly from application.
Working on published application without user admin roles (user with analyzer license cannot start task).

Prerequisites:
  - created reload task
  - security rule for user to read access for reloadtask*
  - security rule for user to read access for ExecutionResult* and executionsession* resource
  - security rule for user to read and update application

Configuration:
  - Refresh interval in ms - interval for reload task status check
  - Task ID - if field is clear, taskId is detected automatically 
  - Waiting to finish reload - application is waiting in "idle" state when reload start if setting is checked

Please reload application after any configuration chanages.

![alt text](https://github.com/inphinityapp/ReloadTaskButton/blob/master/images/settings_button.png)

See also Reload Task Status https://github.com/inphinityapp/ReloadTaskStatus

Examples of needed security rules:

```sh
Resource filter: ExecutionResult*, ExecutionSession*,ReloadTask*
Action: Read
```
![alt text](https://github.com/inphinityapp/ReloadTaskStatus/blob/master/images/RTS_rule.png)

and 

```sh
Resource filter: App_*
Action: Read, Update
Condition: (resource.HasPrivilege("read"))
or 
Condition: ((user.@AccessArea=resource.stream.@AccessArea)) - if customProperty AccessArea is used for access to streams
```
![alt text](https://github.com/inphinityapp/ReloadTaskButton/blob/master/images/RTB_rule.png)

Demo:
![alt text](https://github.com/inphinityapp/ReloadTaskStatus/blob/master/images/reload_task_showcase.gif)

Application example:
![alt text](https://github.com/inphinityapp/ReloadTaskStatus/blob/master/images/reload_task_showcase.png)

Tested Qlik Sense Version: Qlik Sense April 2018 and newer

Supported browsers: 
   - Chrome
   - Firefox
   - Microsoft Edge
   - Internet Explorer 11
   
    
