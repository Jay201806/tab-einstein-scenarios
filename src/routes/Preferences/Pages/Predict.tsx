import React, { useState, useEffect } from 'react';
import { Prediction } from '../../Extension/Pages/Prediction';
import { SFDCPredictionResponse } from '../../../api/types';
import { Preferences, PreferencesPredict, PreferencesTextWeight } from '../../../store/types';
import { TextField, DropdownSelect, Checkbox } from '@tableau/tableau-ui';

interface PredictPrefsContentProps {
    prediction: SFDCPredictionResponse;
    prefs: Preferences;
}

export const PredictPrefsContent: React.FC<PredictPrefsContentProps> = ({
    prediction,
    prefs
}) => {

    return (
        <Prediction
            prediction={prediction}
            prefsOverride={prefs}
        />
    )

}

interface PredictPrefsControlsProps {
    predictPrefs: PreferencesPredict,
    onSettingChanged: (newPrefs: PreferencesPredict) => void;
}

export const PredictPrefsControls: React.FC<PredictPrefsControlsProps> = ({
    predictPrefs,
    onSettingChanged
}) => {

    const [ useThousandsSeparator, setUseThousandsSeparator ] = useState<boolean>(true);
    const [ numDecimalPlaces, setNumDecimalPlaces ] = useState<number>(2);
    const [ isPercentage, setIsPercentage ] = useState<boolean>(false);

    useEffect(() => {
        updateNumberFormat();
    }, [useThousandsSeparator, numDecimalPlaces, isPercentage])

    const updateNumberFormat = () => {
        let numFormat: string = '0';
        if (useThousandsSeparator) numFormat += ',0';
        if (numDecimalPlaces > 0) {
            numFormat += '.';
            for (let i: number = 0; i < numDecimalPlaces; i++) {
                numFormat += '0'
            }
        }
        if (isPercentage) numFormat += '%';
        onSettingChanged({...predictPrefs, numberFormatting: numFormat});
    }

    return (
        <React.Fragment>
            <TextField
                kind='line'
                label='Text Size (Px)'
                onChange={({ target: { value } }) => onSettingChanged({...predictPrefs, textSizeInPx: parseInt(value)})}
                value={predictPrefs.textSizeInPx}
            />
            <DropdownSelect
                kind='line'
                label='Text Weight'
                value={predictPrefs.textWeight}
                onChange={({ target: { value } }) => onSettingChanged({...predictPrefs, textWeight: value as PreferencesTextWeight})}
            >
                <option value='normal'>Normal</option>
                <option value='bold'>Bold</option>
            </DropdownSelect>
            <TextField
                kind='line'
                label='Prefix'
                onChange={({ target: { value } }) => onSettingChanged({...predictPrefs, prefix: value})}
                value={predictPrefs.prefix ? predictPrefs.prefix : ''}
            />
            <TextField
                kind='line'
                label='Suffix'
                onChange={({ target: { value } }) => onSettingChanged({...predictPrefs, suffix: value})}
                value={predictPrefs.suffix ? predictPrefs.suffix : ''}
            />
            <DropdownSelect
                value={numDecimalPlaces.toString()}
                onChange={({ target: { value } }) => setNumDecimalPlaces(parseInt(value))}
            >
                <option>0</option>
                <option>1</option>
                <option>2</option>
                <option>3</option>
                <option>4</option>
                <option>5</option>
                <option>6</option>
            </DropdownSelect>
            <Checkbox
                checked={useThousandsSeparator}
                onChange={({ target: { checked }}) => setUseThousandsSeparator(checked)}
            >
                Use Thousands Separator
            </Checkbox>
            <Checkbox
                checked={isPercentage}
                onChange={({ target: { checked } }) => setIsPercentage(checked)}
            >
                Percentage
            </Checkbox>
        </React.Fragment>
    )

}