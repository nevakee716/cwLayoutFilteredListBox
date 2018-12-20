| **Name** | **Filtered List Box** | **Version** | 
| --- | --- | --- |
| **Updated by** | Mathias PFAUWADEL / Jerome Grondin | 1.0 |


## Patch Notes


* 1.0 : 1st version working

## To be Done

* More Options



## Description 
Allow you to filter data when in edit mode, according others view set up, this allow to for exemple only be able to associate application that are validated. 

You can also make a preselection for exemple we want to associate a city to a process. We first select the country, then we selected the city asociated to the country. This help performance cause we load only the city that are associated to the selected country.

This Layout cannot create associated object, use the standard listbox
This layout support the custom display string, it need to be filled in 1st and 2nd Filter Data View
## Screen Shot

<img src="https://raw.githubusercontent.com/JGrndn/cwLayoutFilteredListBox/master/screen/preview.png" alt="Drawing" style="width: 95%;"/>

## Options

### Node setup

<img src="https://raw.githubusercontent.com/JGrndn/cwLayoutFilteredListBox/master/screen/nodeconfig.png" alt="Drawing" style="width: 95%;"/>

## Options in the evolve Designer

### 1st Filter Data View : 

Indicate the view for the 1st selector of data (can be an object or index page). For exemple, in the country city case, we will choose an indexpage which contain all your country.

### Node ID of the data to use as filter

Indicate the Node ID that will contain the data for the 1st filter (the layout support auto jump&merge so you can the select the node of your choice inside the 1st filter view, the layout will automatically merge data)

### Label for the drop down

Label for the 1st filter, in your exemple country

### 2nd Filter dataView

Indicate the view for the 2nd selector of data (can only be an object page). For exemple, in the country city exemple, we will choose an objectPage based on country which contain all the city of your country.

You leave the parameter blank in that case, the layout will search the nodeID of the second filter inside the 1st view.

### Node ID of the data to associate

Indicate the Node ID that will contain the data for the 2nd filter (the layout support auto jump&merge so you can the select the node of your choice inside the 1st filter view, the layout will automatically merge data)

### Label for the drop down to filter

Label for the 2nd filter, in your exemple City

## zPage Convention

This layout will automatically hide the objectPage that start with "z_", you won't see them inside your objectPages and if you go on them, you will only see the data of this page, no access to the other


## Using only one selector

If you want to only have one level of selection, you can leave blank the option Label for the drop down and Node ID of the data to use as filter.

<img src="https://raw.githubusercontent.com/JGrndn/cwLayoutFilteredListBox/master/screen/oneleve.png" alt="Drawing" style="width: 95%;"/>


## Advanced PIA Exemple

Here we have the following metamodel.

<img src="https://raw.githubusercontent.com/JGrndn/cwLayoutFilteredListBox/master/screen/meta.png" alt="Drawing" style="width: 95%;"/>

We want to create risk analysis from the pia page using the table complexe. But this risk analysis can only be associate to a risk of the processus of the pia.

Let's first configure the table complexe, we will use the table complexe to use a page starting with z_ so we won't see it on the regular risk analysis page.

<img src="https://raw.githubusercontent.com/JGrndn/cwLayoutFilteredListBox/master/screen/tableComplexe.png" alt="Drawing" style="width: 95%;"/>

Now let's configure the filtered List Box to target first the on object page of the PIA from where the risk analysis was created. And let's select the Process as the first level and of course the risk as second level

<img src="https://raw.githubusercontent.com/JGrndn/cwLayoutFilteredListBox/master/screen/pia.png" alt="Drawing" style="width: 95%;"/>

Here we can see that we have only the risk of the process of the PIA of the risk analysis we are creating




