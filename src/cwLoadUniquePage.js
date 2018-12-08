/* Copyright � 2012-2017 erwin, Inc. - All rights reserved */
/*global cwAPI, jQuery*/


(function (cwApi, $) {
    'use strict';

    /*jslint browser:true*/
    function selectNavView($li) {
        $li.addClass('selected');
    }

    function appendMaximizeAndPrintButton($anchor) {
        cwApi.CwMaximize.appendButton($anchor);
        if (!cwApi.queryObject.isEditMode()) {
            cwApi.CwPrintManager.appendPrintButton($anchor);
        }
    }
    
    function setDocumentTitle(title) {
        document.title = title;
    }

    function translateAndSetDocumentTitle(view) {
        var translatedViewName = cwApi.mapToTranslation(view.name);
        setDocumentTitle(translatedViewName);
        return translatedViewName;
    }


    function getPageNavigationForSinglePage(item, objectTypeScriptName) {
        var views, o, i, v, tabCount, viewsLoaded, currentViewName, navView, viewSchema, j, tab, navTab, questionnaireQueTab, questionnaireResultTab;
        if (cwApi.cwConfigs.SingleViewsByObjecttype === null) {
            return [];
        }

        views = cwApi.cwConfigs.SingleViewsByObjecttype[objectTypeScriptName.toLowerCase()];
        
        currentViewName = cwApi.getQueryStringObject().cwview;

        function not_check_view(view) {
          return view[0] === 'z' && view[1] === '_';
        }
        views = views.filter(not_check_view);

        if(currentViewName[0] === 'z' && currentViewName[1] === '_'){
            views = [currentViewName];
        }

        viewsLoaded = views.map(function (v) {
            return cwApi.getView(v);
        });
        viewsLoaded = cwApi.sortBy(viewsLoaded, function (v) {
            if (cwApi.isUndefined(v)) {
                cwApi.Log.Error("One or several views are not correct part of your views, please check case of the views to don't have duplicates, Please check part of these views : " + views.join(','));
                return 0;
            }
            return v.Order;
        });
        currentViewName = cwApi.getQueryStringObject().cwview;
        o = [];
        for (i = 0; i < viewsLoaded.length; i += 1) {
            tabCount = 0;
            v = viewsLoaded[i];
            if (!cwApi.isUndefined(v) && cwApi.cwUser.canAccessView(cwApi.currentUser, v) === true) {
                navView = {};
                navView.viewName = v.cwView;
                navView.selected = (v.cwView === currentViewName);
                navView.tabs = [];
                var displayPropertyObject = new cwAPI.CwDisplayProperties(v.name, false);
				if (displayPropertyObject.formattedFieldValue.indexOf('|>BuiltInSite') === 0) {
					navView.label = cwApi.mapToTranslation(v.name);
				} else {
					navView.label = displayPropertyObject.getDisplayString(item);
				}
                viewSchema = cwApi.ViewSchemaManager.getPageSchema(v.cwView);
                if (viewSchema.Tab !== null) {
                    for (j = 0; j < viewSchema.Tab.Tabs.length; j += 1) {
                        tabCount += 1;
                        tab = viewSchema.Tab.Tabs[j];
                        navTab = {
                            // tab: tab,
                            id: tab.Id,
                            label: cwApi.mapToTranslation(tab.Name)
                        };
                        navView.tabs.push(navTab);
                    }
                }
                // Add object questionnaire tabs
                if (cwApi.isQuestionnaireBehaviuor(viewSchema.Behaviours) && objectTypeScriptName.toLowerCase() !== cwApi.mmDefinition.OBJECTTYPE_SCRIPTNAME_QUESTIONNAIRE) {
                    questionnaireQueTab = {
                        id: 'tab' + tabCount,
                        label: cwApi.mapToTranslation("Questionnaire")
                    };
                    questionnaireResultTab = {
                        id: 'tab' + (tabCount + 1),
                        label: cwApi.mapToTranslation("Result")
                    };
                    navView.tabs.push(questionnaireQueTab);
                    navView.tabs.push(questionnaireResultTab);
                }

                o.push(navView);
            }
        }
        return o;
    }

    function outputPageNavigationForObjectPage(item, objectTypeScriptName, restrictToCurrentView) {
        var pageNavigation, $ulView, i, $li;
        cwApi.CwPendingEventsManager.setEvent("OutputPageNavigationForObjectPage");
        pageNavigation = getPageNavigationForSinglePage(item, objectTypeScriptName);
        $ulView = $('<ul class="navViews"></ul>');
        $('#page-options').html($ulView);

        function outputPageNavigation(navView, $ulViewLocal) {
            $li = cwApi.cwDisplayManager.getViewNav$(navView.viewName, navView.label, '#');
            cwApi.createMainAndSubNavMenus($li, $ulViewLocal, navView, item);

            if (!$li.children('a').hasClass('hassub')) {
                $li.children('a').on('click', function () {
                    cwApi.cwDisplayManager.setContentPage();
                });
                cwApi.cwDisplayManager.setContentPage();
            }
            if (navView.selected) {
                selectNavView($li);
            }
        }

        for (i = 0; i < pageNavigation.length; i += 1) {
            if (restrictToCurrentView) {
                if (pageNavigation[i].viewName === cwApi.getQueryStringObject().cwview) {
                    outputPageNavigation(pageNavigation[i], $ulView);
                }
            } else {
                outputPageNavigation(pageNavigation[i], $ulView);
            }
        }

        cwApi.applyPageMenuJavascript();
        cwApi.CwPendingEventsManager.deleteEvent("OutputPageNavigationForObjectPage");
    }

    cwApi.loadUniquePageCreate = function (view, rootNodeSchema, callback) {
        var objectTypeScriptName, objectType, objectTypeDisplayName, pageDisplayName, pageDisplayDescription;

        cwApi.CwPendingEventsManager.setEvent("LoadUniquePageCreate");

        objectTypeScriptName = view.rootObjectType;
        objectType = cwApi.mm.getObjectType(objectTypeScriptName);
        objectTypeDisplayName = objectType ? objectType.name : objectTypeScriptName;
        pageDisplayName = $.i18n.prop("create_newX", objectTypeDisplayName);
        pageDisplayDescription = $.i18n.prop("create_completeTheInformationAndSaveToCreateANewX", objectTypeDisplayName);
        cwApi.buildDomForPage();
        cwApi.updateDomForView(view);
        setDocumentTitle(pageDisplayName);
        cwApi.addPageInfo(pageDisplayName, pageDisplayDescription, true);
        appendMaximizeAndPrintButton(cwApi.CwSinglePageActions.getLeftButtonsAnchor());
        cwApi.CwShare.appendButton(null, false);
        outputPageNavigationForObjectPage(null, rootNodeSchema.ObjectTypeScriptName, true);
        cwApi.cwDisplayManager.outputObjectPageView(view.cwView, null, rootNodeSchema);
        cwApi.CwPendingEventsManager.deleteEvent("LoadUniquePageCreate");
        return callback(null);
    };


    cwApi.loadObjectPage = function (view, objectId, rootNodeSchema, callback) {
        cwApi.CwPendingEventsManager.setEvent("LoadObjectPage");
        var jsonFile, isUserSocial, pageName, object, adminObject, objectName, objectDescription, objectTypeScriptName, isAcknowledgeMode, questionnaireData, discussionData, isProfile,
            allowValidationRequestForScriptNames, allowValidationRequestForThisObject, objectIsUnderValidation, isQuestionnaireView, allowWorkflowActions;

        pageName = view.cwView;
        isUserSocial = cwApi.cwUser.isCurrentUserSocial();
        isAcknowledgeMode = cwApi.queryObject.isAcknowledgeMode();
        isQuestionnaireView = cwApi.isQuestionnaireView();
        jsonFile = cwApi.getObjectPageJsonUrl(pageName, objectId);
        objectTypeScriptName = rootNodeSchema.ObjectTypeScriptName;
        isProfile = (pageName === cwApi.mmDefinition.OBJECTTYPE_SCRIPTNAME_USER || pageName === 'user');

        cwApi.getJSONFile(jsonFile, function (json) {
            cwApi.CwPendingEventsManager.setEvent("LoadObjectPageGetJSONFile");
            if (cwApi.checkJsonCallback(json)) {
                discussionData = json.discussion;
                questionnaireData = json.questionnaire;
                objectIsUnderValidation = json.isUnderValidation;

                // Set the object from the data
                // The admin object is only set if this is a profile page
                object = cwApi.isLive() ? json.object : json;
                adminObject = cwApi.isModelSelectionPage() ? json.object : json.adminObject;

                // If this is the profile page, get the name from the admin object
                objectName = cwApi.isLive() ? isProfile ? adminObject.name : object.name : object.name;
                objectDescription = object.properties.description;

                // Build the page frame
                cwApi.buildDomForPage();

                // Add the object information to the page
                cwApi.addPageInfo(objectName, objectDescription, true);

                // Process the navigation for the page
                outputPageNavigationForObjectPage(object, objectTypeScriptName, false);

                // Process the maximize & print buttons
                appendMaximizeAndPrintButton(cwApi.CwSinglePageActions.getLeftButtonsAnchor());

                if (cwApi.isLive() && !cwApi.isModelSelectionPage()) {
                    allowWorkflowActions = !isUserSocial && cwApi.cwConfigs.WorkflowEnabled;

                    // Process social items (rating & favourite)
                    cwApi.CwSinglePageActions.appendSocialItems(object, discussionData, function () {
                        /*jslint unparam:true*/
                        // DISPLAY THE COMMENTS ONLY WHEN WE KNOW THE OBJECT IS FAVOURITE OR NOT
                        // Process discussions if comments are enabled
                        if (cwApi.cwConfigs.SocialSiteDefinition.DiscussionsEnabled) {
                            cwApi.cwDiscussionManager.enableDiscussion(object, discussionData, cwApi.CwSinglePageActions.getRightButtonsAnchor());
                        }
                    });

                    // Process object status
                    if (cwApi.cwConfigs.WorkflowEnabled) {
                        cwApi.CwSinglePageActions.setObjectStatusMessage(object, objectIsUnderValidation);
                    }

                    // Process object questionnaires
                    if (!isAcknowledgeMode) {
                        cwApi.CwSinglePageActions.appendQuestionnaires(object, questionnaireData);
                    }

                    if (!cwApi.queryObject.isEditMode()) {
                        if (!isAcknowledgeMode) {
                            if (allowWorkflowActions) {
                                // Check if validation request functionality is configured for this page
                                allowValidationRequestForScriptNames = cwApi.cwConfigs.WorkflowSiteDefinition.ValidationWorkflow.ActiveObjectTypeScriptNames;
                                allowValidationRequestForThisObject = cwApi.stringAppearsInList(allowValidationRequestForScriptNames, objectTypeScriptName, false);
                                if (allowValidationRequestForThisObject) {
                                    // Process create task output
                                    cwApi.CwCreateTask.appendButton(object, cwApi.CwSinglePageActions.getRightButtonsAnchor());
                                }
                            }
                            // Process share (email & workflow)
                            cwApi.CwShare.appendButton(object, allowWorkflowActions, cwApi.CwSinglePageActions.getRightButtonsAnchor());
                        }
                    }
                } else {
                    // Process share (email only)
                    cwApi.CwShare.appendButton(null, false);
                }

                // Load the view for the selected view when the page loads if not a questionnaire
                // We already have the data for the selected view, so we pass this in and don't do another ajax call
                if (isQuestionnaireView === false) {
                    if (cwApi.isCmUserView(view)) {
                        object = adminObject;
                    }
                    cwApi.loadObjectPageView(view, objectId, rootNodeSchema, callback, object);
                    if (cwApi.CwPrintManager.isPrintMode() === true) {
                        cwApi.CwPrintManager.outpuputPrintPage(pageName);
                    }
                } else {
                    if (isQuestionnaireView && !cwApi.isIndexPage()) {
                        if (cwApi.CwPrintManager.isPrintMode() === true) {
                            cwApi.CwPrintManager.outpuputPrintPage(pageName);
                        }
                    }
                    cwApi.CwPendingEventsManager.deleteEvent("LoadObjectPageGetJSONFile");
                    return callback();
                }
            }
            cwApi.CwPendingEventsManager.deleteEvent("LoadObjectPageGetJSONFile");
        }, function (error) {
            cwApi.addLoadPageError($.i18n.prop('error_Page404'));
            cwApi.Log.Error(error);
            cwApi.siteLoadingPageFinish($.i18n.prop('error_Page404'));
        });
        cwApi.CwPendingEventsManager.deleteEvent("LoadObjectPage");
    };

 



}(cwAPI, jQuery));