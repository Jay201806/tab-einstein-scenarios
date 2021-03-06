import React, { useState, useEffect } from 'react';
import { useSelector, shallowEqual } from 'react-redux';
import { RootState } from '../../store';
import { getPrediction } from '../../api';
import { Loading, LayoutExtension } from '../../components';
import type { LayoutExtensionProps } from '../../components/Layouts/Extension';
import { Prediction } from './Pages/Prediction';
import { Explain } from './Pages/Explain';
import { Action } from './Pages/Action';
import { useDispatch } from 'react-redux';
import { extensionSetPredictionResponse } from '../../store/slices/extension';
import { Switch, Route, useLocation, useHistory } from 'react-router-dom';

type PredictionPages = 'predict' | 'explain' | 'action';

export const Predict: React.FC = () => {
  const [ready, setReady] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [paramValues, setParamValues] = useState<{ [key: string]: any }>({});
  const [activePage, setActivePage] = useState<PredictionPages>('predict');

  const { extensions } = window.tableau;
  if (!extensions.dashboardContent)
    throw 'Error: dashboardContent not found in extensions object!';
  if (!extensions.dashboardContent.dashboard)
    throw 'Error: dashboard object not found in dashboardContent object!';
  const { dashboard } = extensions.dashboardContent;

  const {
    auth,
    prediction,
    extension: { predictionResponse },
    preferences,
  } = useSelector((state: RootState) => state, shallowEqual);
  const dispatch = useDispatch();
  const location = useLocation();
  const history = useHistory();

  if (!prediction.mappedFields)
    throw 'Error: no mapped fields found in settings!';

  const getParamValues = async (): Promise<{ [key: string]: any }> => {
    const params = await dashboard.getParametersAsync();
    const values: { [key: string]: any } = {};
    prediction.mappedFields!.forEach((field) => {
      const matchedParam = params.filter((p) => p.name === field.tabParamName);
      if (matchedParam.length === 0)
        throw 'Error: mapped Tableau parameter does not exist in dashboard!';
      values[field.einFieldName] = matchedParam[0].currentValue.value;
    });
    return values;
  };

  const setParamListeners = async (): Promise<(() => any)[]> => {
    const tableauParams = prediction.mappedFields!.map(
      (field) => field.tabParamName
    );
    const unregisterFns: (() => any)[] = [];
    tableauParams.forEach(async (tabParam) => {
      const param = await dashboard.findParameterAsync(tabParam);
      if (param) {
        unregisterFns.push(
          param.addEventListener(
            // @ts-ignore
            'parameter-changed',
            async () => {
              const updatedValues = await getParamValues();
              setParamValues(updatedValues);
            }
          )
        );
      }
    });
    return unregisterFns;
  };

  const updatePrediction = () => {
    setLoading(true);
    const einsteinColNames = Object.keys(paramValues);
    const dataRow = einsteinColNames.map((col) => paramValues[col]);
    getPrediction({
      auth: {
        accessToken: auth.accessToken!,
        tokenType: auth.tokenType!,
        instanceUrl: auth.instanceUrl!,
        refreshToken: auth.refreshToken!,
      },
      predictionDef: {
        id: prediction.id!,
      },
      data: {
        columnNames: einsteinColNames,
        rows: [dataRow],
      },
    }).then((predictionResponse) => {
      console.log(predictionResponse);
      dispatch(extensionSetPredictionResponse(predictionResponse));
      setLoading(false);
    });
  };

  const handlePageChange = (newPage: PredictionPages): void => {
    let path: string;
    switch (newPage) {
      case 'predict':
        path = '/';
        break;
      case 'explain':
        path = '/explain';
        break;
      case 'action':
        path = '/action';
        break;
    }
    setActivePage(newPage);
    if (location.pathname !== path) history.push(path);
  };

  useEffect(() => {
    setReady(false);
    setParamListeners().then((unregisterFns) => {
      getParamValues().then((values) => {
        setParamValues(values);
        setReady(true);
        return unregisterFns;
      });
    });
  }, []);

  useEffect(() => {
    if (Object.keys(paramValues).length > 0) updatePrediction();
  }, [paramValues]);

  if (loading || !ready || !predictionResponse) return <Loading />;

  const layoutProps: LayoutExtensionProps = {
    showToolbar: extensions.environment.mode === 'authoring',
  };
  const explanationExists =
    predictionResponse.predictions[0].prediction.middleValues.length > 0;
  const prescriptiveExists =
    predictionResponse.predictions[0].prescriptions.length > 0;

  if (explanationExists) {
    layoutProps.pages = [
      {
        name: preferences.predict.pageName,
        onClick: () => handlePageChange('predict'),
        active: activePage === 'predict',
      },
    ];
    if (explanationExists)
      layoutProps.pages.push({
        name: preferences.explain.pageName,
        onClick: () => handlePageChange('explain'),
        active: activePage === 'explain',
      });
    if (prescriptiveExists)
      layoutProps.pages.push({
        name: preferences.action.pageName,
        onClick: () => handlePageChange('action'),
        active: activePage === 'action',
      });
  }

  console.log(predictionResponse);

  return (
    <LayoutExtension {...layoutProps}>
      <Switch>
        <Route path="/" exact>
          <Prediction prediction={predictionResponse} />
        </Route>
        <Route path="/explain">
          <Explain prediction={predictionResponse} />
        </Route>
        <Route path="/action">
          <Action prediction={predictionResponse} />
        </Route>
      </Switch>
    </LayoutExtension>
  );
};
